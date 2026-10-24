const admin = require('firebase-admin');

// ── INICIALIZACIÓN DE FIREBASE ADMIN (MODO SEGURO) ──────────────────
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Procesar la clave privada para asegurar saltos de línea correctos
                privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            }),
            databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
        });
        console.log('✅ [Vercel API] Firebase Admin inicializado correctamente.');
    } catch (error) {
        console.error('❌ [Vercel API] Error inicializando Firebase:', error.message);
    }
}

// ── HANDLER DE LA PETICIÓN ──────────────────────────────────────────
module.exports = async (req, res) => {
    // Solo permitir peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Use POST.' });
    }

    const { title, body, image, url } = req.body || {};

    // Exigir un token Firebase ID válido y un registro de administrador autorizado.
    try {
        if (!admin.apps.length) return res.status(503).json({ error: 'Servicio de notificaciones no configurado.' });
        const authorization = req.headers.authorization || '';
        const match = authorization.match(/^Bearer\s+(.+)$/i);
        if (!match) return res.status(401).json({ error: 'Sesión requerida.' });
        let decoded;
        try { decoded = await admin.auth().verifyIdToken(match[1], true); }
        catch (_error) { return res.status(401).json({ error: 'Sesión Firebase inválida o expirada.' }); }
        const adminSnapshot = await admin.database().ref(`admin_users/${decoded.uid}`).once('value');
        const adminRecord = adminSnapshot.val();
        if (!adminRecord || adminRecord.role !== 'admin' || adminRecord.active === false) {
            return res.status(403).json({ error: 'Se requiere una cuenta administradora autorizada.' });
        }

        // Obtener tokens después de verificar los permisos.
        const tokensRef = admin.database().ref('push_tokens');
        const snapshot = await tokensRef.once('value');
        const tokensData = snapshot.val();

        if (!tokensData) {
            return res.status(200).json({ sent: 0, failed: 0, message: 'No hay dispositivos suscritos registrados.' });
        }

        // Extraer los tokens únicos
        const registrationTokens = [...new Set(Object.values(tokensData).map(value => typeof value === 'string' ? value : value && typeof value.token === 'string' ? value.token : null).filter(Boolean))];
        console.log(`📡 [Vercel API] Preparando envío masivo a ${registrationTokens.length} dispositivos.`);

        // 3. Construir el mensaje Multicast
        const message = {
            notification: {
                title: title || 'Puro Llano Radio 🤠',
                body: body || '¡Estamos al aire!',
            },
            data: {
                url: url || '/'
            },
            tokens: registrationTokens
        };

        // Si hay imagen, la incluimos
        if (image && image.startsWith('http')) {
            message.notification.image = image;
        }

        // 4. Enviar mediante Firebase Messaging (Multicast)
        const response = await admin.messaging().sendEachForMulticast(message);

        console.log(`🚀 [Vercel API] Éxito: ${response.successCount} | Fallos: ${response.failureCount}`);

        // Opcional: Limpiar tokens que ya no son válidos (expirados)
        // (Esto mejoraría mucho la salud de tu base de datos más adelante)

        return res.status(200).json({
            sent: response.successCount,
            failed: response.failureCount,
            message: 'Señal emitida con éxito.'
        });

    } catch (error) {
        console.error('🔥 [Vercel API] Error fatal:', error);
        return res.status(500).json({ 
            error: 'Fallo crítico en el servidor.', 
            details: error.message 
        });
    }
};
