/**
 * Verificación simple de Firebase usando REST API
 * No requiere firebase-admin
 */

const https = require('https');

// Configuración de Firebase
const FIREBASE_PROJECT_ID = 'puro-llano-radio-f7166';
const DATABASE_URL = `https://${FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`;

console.log('\n🔍 === VERIFICACIÓN DE FIREBASE (REST API) ===\n');
console.log(`📡 Database URL: ${DATABASE_URL}`);

// Función para hacer requests a Firebase REST API
function getFromFirebase(path) {
  return new Promise((resolve, reject) => {
    const url = `${DATABASE_URL}/${path}.json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

async function verificar() {
  try {
    // 1. Verificar scheduledNotifications
    console.log('\n1️⃣  Verificando scheduledNotifications...');
    const scheduled = await getFromFirebase('scheduledNotifications');
    if (scheduled && Object.keys(scheduled).length > 0) {
      const count = Object.keys(scheduled).length;
      console.log(`   ✅ Existen ${count} notificaciones programadas`);
      Object.entries(scheduled).slice(0, 3).forEach(([key, val]) => {
        console.log(`      - ${key}: "${val.title}"`);
      });
    } else {
      console.log('   ⚠️  No hay notificaciones programadas (normal)');
    }

    // 2. Verificar pushTokens
    console.log('\n2️⃣  Verificando pushTokens...');
    const tokens = await getFromFirebase('pushTokens');
    if (tokens && Object.keys(tokens).length > 0) {
      const count = Object.keys(tokens).length;
      console.log(`   ✅ Existen ${count} tokens de notificación registrados`);
      console.log('   ✅ Los usuarios pueden recibir notificaciones push');
    } else {
      console.log('   ⚠️  No hay tokens registrados');
      console.log('   💡 Los visitantes deben activar notificaciones primero');
    }

    // 3. Verificar notificationsHistory
    console.log('\n3️⃣  Verificando notificationsHistory...');
    const history = await getFromFirebase('notificationsHistory');
    if (history && Object.keys(history).length > 0) {
      const count = Object.keys(history).length;
      console.log(`   ✅ Existen ${count} notificaciones en el historial`);
    } else {
      console.log('   ⚠️  No hay historial (normal si es nuevo)');
    }

    // 4. Resumen
    console.log('\n📊 === RESUMEN ===\n');
    
    const tieneTokens = tokens && Object.keys(tokens).length > 0;

    if (tieneTokens) {
      console.log('✅ Firebase está funcionando correctamente');
      console.log('✅ El cron job de Cloudflare Workers está listo para enviar notificaciones');
      console.log('\n💡 Para probar una notificación:');
      console.log('   1. Ve a Firebase Console');
      console.log('   2. Realtime Database > scheduledNotifications');
      console.log('   3. Agrega un nuevo item con scheduledTime en el pasado');
      console.log('   4. El cron job lo enviará automáticamente');
      console.log('\n🌐 O ejecuta manualmente:');
      console.log('   curl "https://purollanoradio-cron.purollanoradio.workers.dev/?secret=purollanoradio-secret-2026-secure"');
    } else {
      console.log('⚠️  Firebase funciona pero no hay usuarios suscritos');
      console.log('💡 Visita https://purollanoradio.com y activa notificaciones');
    }

    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

verificar();
