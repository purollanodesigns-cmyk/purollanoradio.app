/* ==========================================================================
   CONFIGURACIÓN DE FIREBASE - PURO LLANO RADIO
   ========================================================================== */

// Configuración de Firebase para Puro Llano Radio
const firebaseConfig = {
  apiKey: "AIzaSyBsgxmD12v77f-4ZMaMnJpWiVqhNdIUp6o",
  authDomain: "puro-llano-radio-f7166.firebaseapp.com",
  databaseURL: "https://puro-llano-radio-f7166-default-rtdb.firebaseio.com",
  projectId: "puro-llano-radio-f7166",
  storageBucket: "puro-llano-radio-f7166.firebasestorage.app",
  messagingSenderId: "421432233396",
  appId: "1:421432233396:web:4195239aa97bd9b45db6e1"
};

// Función interna para exponer las refs de Firebase
function _setupFirebaseRefs() {
  window.firebaseRefs = {
    history: firebase.database().ref('radio_history/puro_llano_radio'),
    listeners: firebase.database().ref('radio_listeners/puro_llano_radio'),
    chat: {
      messages: firebase.database().ref('chat/messages'),
      users: firebase.database().ref('chat/users'),
      presence: firebase.database().ref('chat/presence'),
      typing: firebase.database().ref('chat/typing')
    },
    visits: {
      total: firebase.database().ref('visits/puro_llano_radio/total'),
      daily: firebase.database().ref('visits/puro_llano_radio/daily')
    },
    pushTokens: firebase.database().ref('push_tokens'),
    notificationsHistory: firebase.database().ref('notifications_history')
  };
}

// Inicializar Firebase (guard contra doble inicialización)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');

    _setupFirebaseRefs();

    // Inicializar Firebase Cloud Messaging (Push Notifications)
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        window.firebaseMessaging = firebase.messaging();
        console.log('🔔 Firebase Messaging inicializado');
      } else {
        console.warn('⚠️ Push Notifications no soportadas en este navegador');
      }
    } catch (msgError) {
      console.error('❌ Error al inicializar Firebase Messaging:', msgError);
    }

    console.log('📡 Firebase Database listo para historial, oyentes, chat y push');
  } catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
  }
} else if (typeof firebase !== 'undefined' && firebase.apps.length) {
  // Firebase ya estaba inicializado — solo exponer las refs
  console.log('📡 Firebase ya inicializado — exponiendo refs');
  try {
    _setupFirebaseRefs();
  } catch (error) {
    console.error('❌ Error exponiendo refs de Firebase:', error);
  }
}

/* ==========================================================================
   SEGURIDAD DE REALTIME DATABASE
   ==========================================================================
   No publiques reglas con .write: true para todo el chat. El envío de mensajes
   debe pasar por worker.js en /chat-message. Antes de desplegar, configura reglas
   que permitan lectura pública de chat/messages pero nieguen escritura directa;
   protege por separado presence/typing y las rutas administrativas. No pegues
   reglas globales sin revisar radio_history, visits, comentarios y notificaciones.
   ========================================================================== */
