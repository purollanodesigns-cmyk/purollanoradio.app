/* ==========================================================================
   PURO LLANO RADIO - API SERVER PARA RENDER.COM
   ========================================================================== */

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde el directorio actual
app.use(express.static(path.join(__dirname)));

// ── INICIALIZACIÓN DE FIREBASE ADMIN ──────────────────
let firebaseInitialized = false;

try {
    // Verificar que las variables de entorno existan
    if (!process.env.FIREBASE_PROJECT_ID) {
        console.warn('⚠️ FIREBASE_PROJECT_ID no está configurado');
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
        console.warn('⚠️ FIREBASE_CLIENT_EMAIL no está configurado');
    }
    if (!process.env.FIREBASE_PRIVATE_KEY) {
        console.warn('⚠️ FIREBASE_PRIVATE_KEY no está configurado');
    }

    if (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY) {

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Reemplazar \\n con saltos de línea reales
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
                databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
            });
        }
        firebaseInitialized = true;
        console.log('✅ Firebase Admin inicializado correctamente.');
    } else {
        console.warn('⚠️ Firebase no inicializado - Faltan variables de entorno');
    }
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    console.error('Stack:', error.stack);
}

// ── RUTA: Health Check ──────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: firebaseInitialized ? 'ok' : 'degraded',
        message: firebaseInitialized
            ? 'Puro Llano Radio API está funcionando'
            : 'API funcionando pero Firebase no está inicializado',
        firebase: firebaseInitialized ? 'connected' : 'disconnected',
        environment: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            PORT: process.env.PORT || 3000,
        },
        timestamp: new Date().toISOString()
    });
});

// ── RUTA: Root (para evitar "Not Found") ──────────────────
app.get('/', (req, res) => {
    res.status(200).json({
        name: 'Puro Llano Radio API',
        version: '2.0.0',
        description: 'API para envío de notificaciones push',
        endpoints: {
            health: 'GET /api/health',
            sendPush: 'POST /api/send-push',
            cronProcessor: 'POST /api/cron-processor'
        },
        status: firebaseInitialized ? 'ready' : 'waiting for env vars'
    });
});

/**
 * POST /api/send-push
 * Envía una notificación push multicast a todos los tokens registrados.
 * Requiere un Firebase ID Token válido en la cabecera Authorization con rol de admin.
 */
app.post('/api/send-push', async (req, res) => {
    if (!firebaseInitialized) {
        return res.status(503).json({
            error: 'Servicio no disponible',
            message: 'Firebase no está configurado correctamente'
        });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado', message: 'Token de autenticación faltante o inválido.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        // Verificar token de identidad de Firebase
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Consultar el rol del usuario en la base de datos
        const roleSnapshot = await admin.database().ref(`usuarios/${decodedToken.uid}/rol`).once('value');
        const rol = roleSnapshot.val();

        if (rol !== 'admin') {
            console.warn(`⚠️ Intento de acceso no autorizado por UID: ${decodedToken.uid} con rol: ${rol}`);
            return res.status(403).json({ error: 'Acceso denegado', message: 'Se requiere rol de administrador.' });
        }

        const { title, body, image, url } = req.body;

        const tokensRef = admin.database().ref('push_tokens');
        const snapshot = await tokensRef.once('value');
        const tokensData = snapshot.val();

        if (!tokensData) {
            return res.status(200).json({ sent: 0, failed: 0, message: 'No hay dispositivos suscritos.' });
        }

        const registrationTokens = Object.values(tokensData);
        console.log(`📡 Preparando envío a ${registrationTokens.length} dispositivos.`);

        const message = {
            notification: {
                title: title || 'Puro Llano Radio 🤠',
                body: body || '¡Estamos al aire!',
            },
            data: { url: url || '/' },
            tokens: registrationTokens
        };

        if (image && image.startsWith('http')) {
            message.notification.image = image;
        }

        const response = await admin.messaging().sendEachForMulticast(message);

        console.log(`🚀 Éxito: ${response.successCount} | Fallos: ${response.failureCount}`);

        return res.status(200).json({
            sent: response.successCount,
            failed: response.failureCount,
            message: 'Notificaciones enviadas con éxito.'
        });

    } catch (error) {
        console.error('🔥 Error fatal:', error);
        return res.status(500).json({
            error: 'Fallo crítico en el servidor.',
            details: error.message
        });
    }
});

// ── RUTA: CRON Processor ──────────────────
app.post('/api/cron-processor', async (req, res) => {
    if (!firebaseInitialized) {
        return res.status(503).json({
            error: 'Servicio no disponible',
            message: 'Firebase no está configurado correctamente'
        });
    }

    console.log('⏰ [Cron] Iniciando revisión de notificaciones programadas...');
    const now = Date.now();

    try {
        const db = admin.database();
        const scheduledRef = db.ref('scheduledNotifications');
        const historyRef = db.ref('notificationsHistory');
        const tokensRef = db.ref('pushTokens');

        const snapshot = await scheduledRef
            .orderByChild('scheduledTime')
            .endAt(now)
            .once('value');

        const pending = snapshot.val();

        if (!pending) {
            return res.status(200).json({ message: 'No hay notificaciones para enviar.' });
        }

        const tokensSnapshot = await tokensRef.once('value');
        const tokensData = tokensSnapshot.val();
        if (!tokensData) {
            return res.status(200).json({ message: 'No hay tokens registrados.' });
        }
        const registrationTokens = Object.values(tokensData);

        const results = [];

        for (const [key, item] of Object.entries(pending)) {
            if (item.sent) continue;

            console.log(`🚀 [Cron] Enviando: "${item.title}"`);

            const message = {
                notification: { title: item.title, body: item.body },
                data: { url: item.url || '/' },
                tokens: registrationTokens
            };
            if (item.image) message.notification.image = item.image;

            const response = await admin.messaging().sendEachForMulticast(message);

            await historyRef.push({
                ...item,
                sentAt: admin.database.ServerValue.TIMESTAMP,
                sentDetails: { success: response.successCount, failure: response.failureCount }
            });

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
});

// ── 404 Handler ──────────────────
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `La ruta ${req.method} ${req.path} no existe`,
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'POST /api/send-push',
            'POST /api/cron-processor'
        ]
    });
});

// ── INICIAR SERVIDOR ──────────────────
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 PURO LLANO RADIO API');
    console.log('='.repeat(60));
    console.log(`📡 Puerto: ${PORT}`);
    console.log(`🌐 URL: https://localhost:${PORT}`);
    console.log(`🔥 Firebase: ${firebaseInitialized ? '✅ Conectado' : '❌ Desconectado'}`);
    console.log('='.repeat(60));
    console.log('Endpoints disponibles:');
    console.log('  GET  /');
    console.log('  GET  /api/health');
    console.log('  POST /api/send-push');
    console.log('  POST /api/cron-processor');
    console.log('='.repeat(60));
});

module.exports = app;
