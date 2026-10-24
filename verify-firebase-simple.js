/**
 * Verificación completa de Firebase usando REST API
 * Comprueba el estado de la conexión, permisos y datos de Realtime Database
 */

const https = require('https');

// Configuración de Firebase
const FIREBASE_PROJECT_ID = 'puro-llano-radio-f7166';
const DATABASE_URL = `https://${FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`;

console.log('\n🔍 === VERIFICACIÓN DE FIREBASE (PURO LLANO RADIO) ===\n');
console.log(`📡 Database URL: ${DATABASE_URL}\n`);

function requestFirebase(path) {
  return new Promise((resolve) => {
    const url = `${DATABASE_URL}/${path}.json`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && typeof parsed === 'object' && parsed.error) {
            resolve({ ok: false, status: res.statusCode, error: parsed.error, data: null });
          } else {
            resolve({ ok: true, status: res.statusCode, error: null, data: parsed });
          }
        } catch (e) {
          resolve({ ok: false, status: res.statusCode, error: 'Parse Error', data: null });
        }
      });
    }).on('error', (err) => {
      resolve({ ok: false, status: 0, error: err.message, data: null });
    });
  });
}

async function verificar() {
  const checks = [
    { name: 'Historial de Canciones', path: 'radio_history/puro_llano_radio' },
    { name: 'Oyentes Conectados', path: 'radio_listeners/puro_llano_radio' },
    { name: 'Contador de Visitas', path: 'visits/puro_llano_radio/total' },
    { name: 'Chat (Mensajes)', path: 'chat/messages' },
    { name: 'Tokens de Notificaciones (push_tokens)', path: 'push_tokens' },
    { name: 'Historial de Notificaciones (notifications_history)', path: 'notifications_history' },
    { name: 'Notificaciones Programadas (scheduledNotifications)', path: 'scheduledNotifications' },
    { name: 'Tokens Alternativos (pushTokens)', path: 'pushTokens' },
    { name: 'Historial Alternativo (notificationsHistory)', path: 'notificationsHistory' }
  ];

  let permissionIssues = [];

  for (let i = 0; i < checks.length; i++) {
    const check = checks[i];
    const res = await requestFirebase(check.path);

    if (res.ok) {
      if (res.data === null) {
        console.log(`✅ [${res.status}] ${check.name}: Accesible (Ruta vacía - normal)`);
      } else if (typeof res.data === 'object') {
        const count = Object.keys(res.data).length;
        console.log(`✅ [${res.status}] ${check.name}: Accesible (${count} registros)`);
      } else {
        console.log(`✅ [${res.status}] ${check.name}: Accesible (Valor: ${res.data})`);
      }
    } else {
      console.log(`⚠️  [${res.status}] ${check.name}: ${res.error}`);
      if (res.error && res.error.toLowerCase().includes('permission')) {
        permissionIssues.push(check.path);
      }
    }
  }

  console.log('\n📊 === DIAGNÓSTICO DE CONFIGURACIÓN ===\n');

  if (permissionIssues.length > 0) {
    console.log(`⚠️  Hay ${permissionIssues.length} ruta(s) con permiso denegado por las reglas actuales de Firebase:`);
    permissionIssues.forEach(p => console.log(`   - ${p}`));
    console.log('\n💡 SOLUCIÓN:');
    console.log('   Copia el contenido del archivo "firebase-rules.json" y pégalo en:');
    console.log('   Firebase Console → Realtime Database → Reglas (Rules) → Publicar');
  } else {
    console.log('🎉 ¡Todas las rutas de Firebase están perfectamente configuradas y accesibles!');
  }

  console.log('\n');
}

verificar();
