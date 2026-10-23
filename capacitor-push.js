// Capacitor Push Notifications - Puro Llano Radio
// Sistema mejorado de notificaciones push para iOS/Android

import { Plugins } from '@capacitor/core';
const { PushNotifications, LocalNotifications, BackgroundTask } = Plugins;

class PushNotificationManager {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
    this.notificationListeners = [];
  }

  // Inicializar sistema de notificaciones
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Solicitar permisos
      const permission = await PushNotifications.requestPermissions();
      
      if (permission.receive === 'granted') {
        // Registrar para recibir push
        await PushNotifications.register();
        
        // Configurar listeners
        this.setupListeners();
        
        // Obtener token FCM
        this.getFCMToken();
        
        this.isInitialized = true;
        console.log('✅ Sistema de notificaciones inicializado');
      } else {
        console.warn('⚠️ Permiso de notificaciones denegado');
      }
    } catch (error) {
      console.error('❌ Error al inicializar notificaciones:', error);
    }
  }

  // Configurar listeners de notificaciones
  setupListeners() {
    // Notificación recibida en primer plano
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📩 Notificación recibida en primer plano:', notification);
      
      // Mostrar notificación local
      this.showLocalNotification({
        title: notification.title || 'Puro Llano Radio',
        body: notification.body || 'Nueva actualización',
        data: notification.data
      });
      
      // Actualizar badge
      this.updateBadgeCount(1);
    });

    // Notificación abierta por el usuario
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('👆 Notificación abierta:', action);
      
      // Manejar acción de la notificación
      this.handleNotificationAction(action);
      
      // Resetear badge
      this.updateBadgeCount(0);
    });

    // Token FCM registrado
    PushNotifications.addListener('registration', (token) => {
      console.log('🔑 Token FCM registrado:', token.value);
      this.fcmToken = token.value;
      
      // Guardar token en Firebase
      this.saveTokenToFirebase(token.value);
    });

    // Error en registro
    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Error en registro de notificaciones:', error);
    });
  }

  // Obtener token FCM
  async getFCMToken() {
    try {
      const info = await PushNotifications.getDeliveredNotifications();
      console.log('📱 Información de notificaciones:', info);
    } catch (error) {
      console.error('❌ Error al obtener token:', error);
    }
  }

  // Guardar token en Firebase
  async saveTokenToFirebase(token) {
    try {
      if (window.firebaseRefs && window.firebaseRefs.pushTokens) {
        const tokenKey = `device_${Date.now()}`;
        const tokenData = {
          token: token,
          platform: this.getPlatform(),
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          appVersion: this.getAppVersion()
        };
        
        await window.firebaseRefs.pushTokens.child(tokenKey).set(tokenData);
        console.log('💾 Token guardado en Firebase');
      }
    } catch (error) {
      console.error('❌ Error al guardar token:', error);
    }
  }

  // Mostrar notificación local
  async showLocalNotification(notification) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: notification.title,
          body: notification.body,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'notification.wav',
          attachments: notification.image ? [
            { id: 'image', url: notification.image }
          ] : null,
          actionTypeId: '',
          extra: notification.data || {}
        }]
      });
    } catch (error) {
      console.error('❌ Error al mostrar notificación local:', error);
    }
  }

  // Manejar acción de notificación
  handleNotificationAction(action) {
    const data = action.notification.data;
    
    if (data && data.url) {
      // Navegar a URL específica
      window.location.href = data.url;
    } else if (data && data.action === 'play') {
      // Reproducir radio
      if (typeof window.togglePlay === 'function') {
        window.togglePlay();
      }
    } else if (data && data.action === 'open_chat') {
      // Abrir chat
      if (typeof window.toggleChatInterno === 'function') {
        window.toggleChatInterno();
      }
    }
  }

  // Actualizar contador de badge
  async updateBadgeCount(count) {
    try {
      await LocalNotifications.getPending();
      // En iOS/Android, el badge se actualiza automáticamente
      // Podemos usar una API nativa si es necesario
    } catch (error) {
      console.error('❌ Error al actualizar badge:', error);
    }
  }

  // Enviar notificación programada
  async scheduleNotification(title, body, scheduleAt, data = {}) {
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: title,
          body: body,
          id: Date.now(),
          schedule: { at: scheduleAt },
          sound: 'notification.wav',
          extra: data
        }]
      });
      console.log('⏰ Notificación programada:', title);
    } catch (error) {
      console.error('❌ Error al programar notificación:', error);
    }
  }

  // Programar notificaciones de programas
  scheduleProgramNotifications() {
    // Programar notificaciones para programas semanales
    const programs = [
      { day: 1, hour: 10, minute: 0, title: 'Mañanas de Joropo', body: '¡Comienza Mañanas de Joropo!' },
      { day: 2, hour: 14, minute: 0, title: 'Tarde de Colección', body: 'Los clásicos del folklore llanero' },
      { day: 5, hour: 18, minute: 0, title: 'Hora Estelar', body: 'Los temas más solicitados' },
      { day: 6, hour: 20, minute: 0, title: 'Noche de Fuego Llanero', body: 'La música más candente' },
      { day: 0, hour: 15, minute: 0, title: 'Tarde de Familia', body: 'Programa especial para compartir en familia' }
    ];

    programs.forEach(program => {
      const now = new Date();
      const targetDate = new Date();
      
      // Calcular siguiente ocurrencia del día
      const daysUntil = (program.day - now.getDay() + 7) % 7;
      targetDate.setDate(now.getDate() + daysUntil);
      targetDate.setHours(program.hour, program.minute, 0, 0);
      
      // Si ya pasó hoy, programar para la próxima semana
      if (targetDate < now) {
        targetDate.setDate(targetDate.getDate() + 7);
      }
      
      this.scheduleNotification(
        program.title,
        program.body,
        targetDate,
        { action: 'play', program: program.title }
      );
    });
  }

  // Enviar notificación de canción popular
  async sendPopularSongNotification(songTitle, artistName) {
    const notification = {
      title: '🎵 Canción Popular',
      body: `${songTitle} - ${artistName} está sonando ahora`,
      data: {
        action: 'play',
        song: songTitle,
        artist: artistName,
        timestamp: Date.now()
      }
    };
    
    await this.showLocalNotification(notification);
  }

  // Enviar notificación de evento especial
  async sendEventNotification(eventTitle, eventDescription, eventTime) {
    const notification = {
      title: `📅 ${eventTitle}`,
      body: eventDescription,
      data: {
        action: 'open_event',
        event: eventTitle,
        time: eventTime,
        url: '/eventos.html'
      }
    };
    
    await this.showLocalNotification(notification);
    
    // También programar recordatorio 1 hora antes
    const reminderTime = new Date(eventTime);
    reminderTime.setHours(reminderTime.getHours() - 1);
    
    this.scheduleNotification(
      `⏰ Recordatorio: ${eventTitle}`,
      `Comienza en 1 hora: ${eventDescription}`,
      reminderTime,
      { action: 'open_event', event: eventTitle }
    );
  }

  // Obtener plataforma
  getPlatform() {
    if (window.capacitor && window.capacitor.getPlatform) {
      return window.capacitor.getPlatform();
    }
    return navigator.userAgent.includes('Android') ? 'android' : 
           navigator.userAgent.includes('iPhone') ? 'ios' : 'web';
  }

  // Obtener versión de la app
  getAppVersion() {
    return '1.0.0'; // Debería venir del build
  }

  // Suscribirse a notificaciones
  async subscribeToNotifications() {
    await this.initialize();
    
    // Programar notificaciones recurrentes
    this.scheduleProgramNotifications();
    
    // Configurar notificaciones de canciones populares
    this.setupSongNotifications();
    
    console.log('🔔 Suscrito a notificaciones push');
  }

  // Configurar notificaciones de canciones
  setupSongNotifications() {
    // Escuchar cambios en la canción actual
    if (window.songHistory) {
      window.songHistory.onSongChange = (song) => {
        // Enviar notificación si la canción es muy popular
        if (song.popularity > 80) {
          this.sendPopularSongNotification(song.title, song.artist);
        }
      };
    }
  }

  // Cancelar todas las notificaciones programadas
  async cancelAllScheduledNotifications() {
    try {
      await LocalNotifications.cancelAll();
      console.log('🗑️ Todas las notificaciones canceladas');
    } catch (error) {
      console.error('❌ Error al cancelar notificaciones:', error);
    }
  }

  // Obtener estado de permisos
  async getPermissionStatus() {
    try {
      const result = await PushNotifications.checkPermissions();
      return result.receive;
    } catch (error) {
      console.error('❌ Error al verificar permisos:', error);
      return 'denied';
    }
  }
}

// Instancia global
const pushManager = new PushNotificationManager();

// Exportar funciones globales
window.subscribeToPushNotifications = () => pushManager.subscribeToNotifications();
window.sendTestNotification = () => pushManager.sendPopularSongNotification(
  'Test Song',
  'Test Artist'
);
window.cancelAllNotifications = () => pushManager.cancelAllScheduledNotifications();
window.getNotificationPermission = () => pushManager.getPermissionStatus();

// Inicializar automáticamente en modo app
if (window.capacitor) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      pushManager.initialize();
    }, 2000);
  });
}

export default pushManager;