/**
 * Script de verificación de Firebase
 * Comprueba que la estructura de Firebase sea correcta para el cron job
 */

const admin = require('firebase-admin');

// Cargar variables de entorno desde .env si existe
try {
  require('dotenv').config();
} catch (e) {
  console.log('⚠️  No se encontró .env, usa variables del sistema');
}

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'puro-llano-radio-f7166',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@puro-llano-radio-f7166.iam.gserviceaccount.com',
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://puro-llano-radio-f7166-default-rtdb.firebaseio.com`
    });
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar Firebase Admin:', error.message);
    process.exit(1);
  }
}

async function verificarFirebase() {
  console.log('\n🔍 === VERIFICACIÓN DE FIREBASE ===\n');

  try {
    const db = admin.database();

    // 1. Verificar scheduledNotifications
    console.log('1️⃣  Verificando scheduledNotifications...');
    const scheduledSnap = await db.ref('scheduledNotifications').once('value');
    const scheduled = scheduledSnap.val();
    if (scheduled) {
      const count = Object.keys(scheduled).length;
      console.log(`   ✅ Existen ${count} notificaciones programadas`);
      console.log('   Ejemplos:');
      Object.entries(scheduled).slice(0, 3).forEach(([key, val]) => {
        console.log(`      - ${key}: "${val.title}" (scheduledTime: ${new Date(val.scheduledTime).toLocaleString()})`);
      });
    } else {
      console.log('   ⚠️  No hay notificaciones programadas (esto es normal)');
    }

    // 2. Verificar pushTokens
    console.log('\n2️⃣  Verificando pushTokens...');
    const tokensSnap = await db.ref('pushTokens').once('value');
    const tokens = tokensSnap.val();
    if (tokens) {
      const count = Object.keys(tokens).length;
      console.log(`   ✅ Existen ${count} tokens registrados`);
      console.log('   Esto significa que los usuarios pueden recibir notificaciones');
    } else {
      console.log('   ⚠️  No hay tokens de push registrados');
      console.log('   💡 Los usuarios deben activar notificaciones en el sitio');
    }

    // 3. Verificar notificationsHistory
    console.log('\n3️⃣  Verificando notificationsHistory...');
    const historySnap = await db.ref('notificationsHistory').once('value');
    const history = historySnap.val();
    if (history) {
      const count = Object.keys(history).length;
      console.log(`   ✅ Existen ${count} notificaciones en el historial`);
    } else {
      console.log('   ⚠️  No hay historial de notificaciones (esto es normal si es nuevo)');
    }

    // 4. Resumen final
    console.log('\n📊 === RESUMEN ===\n');
    
    const tieneScheduled = scheduled && Object.keys(scheduled).length > 0;
    const tieneTokens = tokens && Object.keys(tokens).length > 0;
    const tieneHistory = history && Object.keys(history).length > 0;

    if (tieneTokens) {
      console.log('✅ Firebase está configurado correctamente');
      console.log('✅ El cron job funcionará cuando haya notificaciones programadas');
      console.log('\n💡 Para probar:');
      console.log('   1. Ve a Firebase Console > Realtime Database');
      console.log('   2. Agrega una notificación en scheduledNotifications con:');
      console.log('      {');
      console.log('        "title": "Prueba",');
      console.log('        "body": "Esta es una notificación de prueba",');
      console.log('        "scheduledTime": ' + (Date.now() - 1000) + ', // Hace 1 segundo');
      console.log('        "url": "/"');
      console.log('      }');
      console.log('   3. El cron job la enviará en los próximos 10 minutos');
      console.log('   4. O ejecuta manualmente:');
      console.log('      curl "https://purollanoradio-cron.purollanoradio.workers.dev/?secret=purollanoradio-secret-2026-secure"');
    } else {
      console.log('⚠️  Firebase está funcionando pero no hay tokens de usuarios');
      console.log('💡 Los visitantes deben activar notificaciones primero');
      console.log('   Ve a: https://purollanoradio.com y haz clic en "Activar Notificaciones"');
    }

    console.log('');

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar verificación
verificarFirebase();
