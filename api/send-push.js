const admin = require('firebase-admin');

// ── INICIALIZACIÓN DE FIREBASE ADMIN (MODO SEGURO) ──────────────────
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Procesar la clave privada para asegurar saltos de línea correctos
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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

    const { title, body, image, url, pin } = req.body;

    // 1. Verificar PIN de seguridad (Previene spam externo)
    const ADMIN_PIN = process.env.ADMIN_PIN || 'PuroLlano2024';
    if (pin !== ADMIN_PIN) {
        return res.status(401).json({ error: 'Relájate, gallo. PIN de administrador incorrecto.' });
    }

    // 2. Obtener todos los tokens de dispositivos del Realtime Database
    try {
        let tokensRef = admin.database().ref('push_tokens');
        let snapshot = await tokensRef.once('value');
        let tokensData = snapshot.val();

        if (!tokensData) {
            tokensRef = admin.database().ref('pushTokens');
            snapshot = await tokensRef.once('value');
            tokensData = snapshot.val();
        }

        if (!tokensData) {
            return res.status(200).json({ sent: 0, failed: 0, message: 'No hay dispositivos suscritos registrados.' });
        }

        // Extraer los tokens únicos en formato string
        const registrationTokens = [...new Set(
            Object.values(tokensData)
                .map(val => (typeof val === 'string' ? val : (val && val.token)))
                .filter(val => typeof val === 'string' && val.length > 0)
        )];

        if (registrationTokens.length === 0) {
            return res.status(200).json({ sent: 0, failed: 0, message: 'No hay tokens válidos registrados.' });
        }

        console.log(`📡 [API] Preparando envío masivo a ${registrationTokens.length} dispositivos.`);

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
