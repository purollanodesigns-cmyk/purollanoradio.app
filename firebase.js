/* ==========================================================================
   CONFIGURACIÓN DE FIREBASE - PURO LLANO RADIO
   ========================================================================== */

// Configuración oficial de Firebase para Puro Llano Radio
const firebaseConfig = {
  apiKey: "AIzaSyBsgxmD12v77f-4ZMaMnJpWiVqhNdIUp6o",
  authDomain: "puro-llano-radio-f7166.firebaseapp.com",
  databaseURL: "https://puro-llano-radio-f7166-default-rtdb.firebaseio.com",
  projectId: "puro-llano-radio-f7166",
  storageBucket: "puro-llano-radio-f7166.firebasestorage.app",
  messagingSenderId: "421432233396",
  appId: "1:421432233396:web:4195239aa97bd9b45db6e1"
};

// Exportar globalmente la configuración
window.firebaseConfig = firebaseConfig;

// Endpoint del Cloudflare Worker para envío de mensajes de chat
window.CHAT_MESSAGE_ENDPOINT = window.CHAT_MESSAGE_ENDPOINT || 'https://purollanoradio-cron.purollanoradio.workers.dev';

// Inicializar Firebase solo si existe y no ha sido inicializado previamente
if (typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('✅ Firebase inicializado correctamente');
    } else {
      console.log('📡 Firebase ya estaba inicializado');
    }

    // Inicializar referencias de Realtime Database si el módulo está disponible
    if (typeof firebase.database === 'function') {
      const db = firebase.database();
      window.firebaseRefs = {
        history: db.ref('radio_history/puro_llano_radio'),
        listeners: db.ref('radio_listeners/puro_llano_radio'),
        chat: {
          messages: db.ref('chat/messages'),
          users: db.ref('chat/users'),
          presence: db.ref('chat/presence'),
          typing: db.ref('chat/typing')
        },
        visits: {
          total: db.ref('visits/puro_llano_radio/total'),
          daily: db.ref('visits/puro_llano_radio/daily')
        },
        pushTokens: db.ref('push_tokens'),
        push_tokens: db.ref('push_tokens'),
        notificationsHistory: db.ref('notifications_history'),
        notifications_history: db.ref('notifications_history'),
        scheduledNotifications: db.ref('scheduledNotifications'),
        artistas: db.ref('artistas'),
        talentoPosts: db.ref('talento_posts'),
        usuarios: db.ref('usuarios'),
        perfiles: db.ref('perfiles')
      };
      console.log('📡 Firebase Database listo para historial, oyentes, chat, visitas y notificaciones');
    } else {
      window.firebaseRefs = window.firebaseRefs || {};
      console.warn('⚠️ Módulo firebase.database no disponible en esta página');
    }

    // Inicializar Firebase Cloud Messaging (Push Notifications) si está disponible
    if (typeof firebase.messaging === 'function') {
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          window.firebaseMessaging = firebase.messaging();
          console.log('🔔 Firebase Messaging inicializado');
        } else {
          console.warn('⚠️ Push Notifications no soportadas en este navegador');
        }
      } catch (msgError) {
        console.warn('⚠️ Error al inicializar Firebase Messaging:', msgError.message);
      }
    }
  } catch (error) {
    console.error('❌ Error general al inicializar Firebase:', error);
    window.firebaseRefs = window.firebaseRefs || {};
  }
} else {
  console.warn('⚠️ SDK de Firebase no encontrado al cargar firebase.js');
  window.firebaseRefs = window.firebaseRefs || {};
}

/* ==========================================================================
   SEGURIDAD DE REALTIME DATABASE
   ==========================================================================
   El envío de mensajes de chat pasa por el worker en /chat-message.
   Las reglas de seguridad se gestionan desde Firebase Console o usando
   el archivo firebase-rules.json incluido en este proyecto.
   ========================================================================== */
