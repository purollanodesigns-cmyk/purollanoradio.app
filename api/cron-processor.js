const admin = require('firebase-admin');

// ── INICIALIZACIÓN DE FIREBASE ─────────────────────────────────────
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
}

// ── HANDLER DEL CRON ───────────────────────────────────────────────
module.exports = async (req, res) => {
    // Vercel envía una cabecera especial en tareas CRON para seguridad
    // if (req.headers['x-vercel-cron'] !== '1') {
    //     return res.status(401).json({ error: 'Acceso no autorizado' });
    // }

    console.log('⏰ [Cron] Iniciando revisión de notificaciones programadas...');
    const now = Date.now();
    
    try {
        const db = admin.database();
        const scheduledRef = db.ref('scheduledNotifications');
        const historyRef = db.ref('notificationsHistory');
        const tokensRef = db.ref('pushTokens');

        // 1. Buscar notificaciones pendientes
        const snapshot = await scheduledRef
            .orderByChild('scheduledTime')
            .endAt(now)
            .once('value');
        
        const pending = snapshot.val();

        if (!pending) {
            return res.status(200).json({ message: 'No hay notificaciones para enviar en este ciclo.' });
        }

        // 2. Obtener tokens de suscriptores
        let tokensSnapshot = await db.ref('push_tokens').once('value');
        let tokensData = tokensSnapshot.val();
        if (!tokensData) {
            tokensSnapshot = await db.ref('pushTokens').once('value');
            tokensData = tokensSnapshot.val();
        }

        if (!tokensData) return res.status(200).json({ message: 'No hay tokens registrados.' });

        const registrationTokens = [...new Set(
            Object.values(tokensData)
                .map(val => (typeof val === 'string' ? val : (val && val.token)))
                .filter(val => typeof val === 'string' && val.length > 0)
        )];

        if (registrationTokens.length === 0) {
            return res.status(200).json({ message: 'No hay tokens válidos registrados.' });
        }

        const results = [];

        // 3. Procesar cada notificación pendiente
        for (const [key, item] of Object.entries(pending)) {
            if (item.sent) continue;

            console.log(`🚀 [Cron] Enviando programada: "${item.title}"`);

            const message = {
                notification: { title: item.title, body: item.body || '' },
                data: { url: item.url || '/' },
                tokens: registrationTokens
            };
            if (item.image) message.notification.image = item.image;

            // Enviar Push
            const response = await admin.messaging().sendEachForMulticast(message);
            
            // Mover a Historial y marcar como enviada (en ambas rutas)
            const historyItem = {
                ...item,
                sentAt: admin.database.ServerValue.TIMESTAMP,
                sentDetails: { success: response.successCount, failure: response.failureCount }
            };
            await db.ref('notifications_history').push(historyItem);
            await db.ref('notificationsHistory').push(historyItem);

            // Eliminar de pendientes
            await scheduledRef.child(key).remove();

            results.push({ title: item.title, success: response.successCount });
        }

        return res.status(200).json({
            processed: results.length,
            details: results
        });

    } catch (error) {
        console.error('🔥 [Cron] Error:', error);
        return res.status(500).json({ error: error.message });
    }
};
