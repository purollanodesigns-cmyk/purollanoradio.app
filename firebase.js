/* ==========================================================================
   CONFIGURACIÓN DE FIREBASE - PURO LLANO RADIO
   ========================================================================== */

// Configuración de Firebase para Puro Llano Radio
const firebaseConfig = {
  apiKey: "AIzaSyBsgxmD12v77f-4ZMaMnJpWiVqhNdIUp6o",
  authDomain: "puro-llano-radio-f7166.firebaseapp.com",
  projectId: "puro-llano-radio-f7166",
  storageBucket: "puro-llano-radio-f7166.firebasestorage.app",
  messagingSenderId: "421432233396",
  appId: "1:421432233396:web:4195239aa97bd9b45db6e1"
};

// Inicializar Firebase
if (typeof firebase !== 'undefined') {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');

    // Referencias a las colecciones
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
}

/* ==========================================================================
   REGLAS DE SEGURIDAD PARA FIREBASE - ¡IMPORTANTE!
   ==========================================================================

   Debes configurar estas reglas en:
   Firebase Console → Realtime Database → Rules

   PASOS:
   1. Ve a https://console.firebase.google.com/
   2. Selecciona: puro-llano-radio-f7166
   3. Click en "Build" → "Realtime Database"
   4. Click en "Rules"
   5. Pega las siguientes reglas y publica

   {
     "rules": {
       "radio_history": {
         "puro_llano_radio": {
           ".read": true,
           ".write": true,
           "leader": {
             ".indexOn": ["timestamp"]
           }
         }
       },
       "radio_listeners": {
         "puro_llano_radio": {
           ".read": true,
           ".write": true
         }
       },
       "visits": {
         "puro_llano_radio": {
           ".read": true,
           ".write": true
         }
       },
       "chat": {
         "messages": {
           ".read": true,
           ".write": true,
           ".indexOn": ["timestamp"]
         },
         "users": {
           ".read": true,
           ".write": true
         },
         "presence": {
           ".read": true,
           ".write": true
         },
         "typing": {
           ".read": true,
           ".write": true
         }
       },
       "notifications_history": {
         ".read": true,
         ".write": true,
         ".indexOn": ["timestamp"]
       },
       "push_tokens": {
         ".read": true,
         ".write": true
       },
       "blog_comments": {
         "puro_llano_radio": {
           ".read": true,
           ".write": true,
           ".indexOn": ["timestamp"]
         }
       }
     }
   }

   EXPLICACIÓN:
   - .read: true → Todos pueden leer (público)
   - .write: true → Todos pueden escribir (necesario para chat y comentarios)
   - .indexOn → Índice para búsquedas rápidas por timestamp

   NOTA: Para producción, deberías restringir .write con autenticación,
   pero para este caso funciona así.
   ========================================================================== */
