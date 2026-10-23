/* ==========================================================================
   CONFIGURACIÓN DE FIREBASE - PURO LLANO RADIO (Versión Simplificada)
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

// Inicializar Firebase solo si la variable existe y no está ya inicializada
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado correctamente');
    
    // Referencias a las colecciones (solo lectura para evitar problemas)
    window.firebaseRefs = {
      history: firebase.database().ref('radio_history/puro_llano_radio'),
      listeners: firebase.database().ref('radio_listeners/puro_llano_radio')
    };
    
    console.log('📡 Firebase listo para historial y oyentes');
    
  } catch (error) {
    console.warn('⚠️ Firebase no disponible:', error.message);
    // Crear objeto vacío para evitar errores
    window.firebaseRefs = {};
  }
} else if (typeof firebase !== 'undefined') {
  console.log('📡 Firebase ya estaba inicializado');
} else {
  console.warn('⚠️ Firebase no disponible en este entorno');
  window.firebaseRefs = {};
}

/* ==========================================================================
   REGLAS DE SEGURIDAD PARA FIREBASE - ¡IMPORTANTE!
   ==========================================================================

   Debes configurar estas reglas en:
   Firebase Console → Realtime Database → Rules

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
       }
     }
   }
   ========================================================================== */