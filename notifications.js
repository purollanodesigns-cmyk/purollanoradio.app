/* ==========================================================================
   SISTEMA DE NOTIFICACIONES PUSH - PURO LLANO RADIO
   ==========================================================================
   Patrón: Facade + Singleton
   Responsabilidad: Gestionar notificaciones push usando Firebase Cloud
   Messaging (FCM) con Web Push API nativa como infraestructura.

   Reemplaza completamente la dependencia de OneSignal con un sistema
   propio basado en FCM + VAPID keys.
   ========================================================================== */

/**
 * @fileoverview Módulo de notificaciones push para Puro Llano Radio.
 * Usa Firebase Cloud Messaging para suscripción y entrega de push,
 * almacena tokens en Firebase RTDB, y maneja notificaciones en foreground.
 *
 * @requires firebase-app-compat.js
 * @requires firebase-messaging-compat.js
 * @requires firebase.js (firebaseMessaging, firebaseRefs.pushTokens)
 */
(function () {
    'use strict';

    // ── Constantes ──────────────────────────────────────────────────────

    /**
     * VAPID Key pública generada en Firebase Console.
     * Ruta: Project Settings → Cloud Messaging → Web Push certificates
     * @const {string}
     */
    var VAPID_KEY = 'BPFSmayg8RLH3dooLOIEKrZvlwrrhj9cD6U5BHNAnCssdgeMSY7qe5MeS2dTeGeQHDyoahWCLcjXWAApG9VrpT8';

    /** @const {string} Clave de localStorage para el token FCM actual */
    var TOKEN_STORAGE_KEY = 'plr_fcm_token';

    /** @const {string} URL del icono para las notificaciones */
    var NOTIFICATION_ICON = 'https://purollanoradio.com/PUROLLANORADIO-COM-ICONO.png';

    // ── Estado interno ──────────────────────────────────────────────────

    /** @type {boolean} Evita múltiples inicializaciones (Singleton) */
    var isInitialized = false;

    /** @type {string|null} Token FCM actual del dispositivo */
    var currentToken = null;

    // ── Utilidades ──────────────────────────────────────────────────────

    /**
     * Genera un hash corto de un string para usar como clave en RTDB.
     * Evita caracteres no permitidos en claves de Firebase (.#$[]/). 
     * @param {string} str - String a hashear
     * @returns {string} Hash alfanumérico de 12 caracteres
     */
    function hashToken(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32-bit integer
        }
        // Convertir a string alfanumérico positivo
        return 'tk_' + Math.abs(hash).toString(36) + '_' + str.slice(-8);
    }

    /**
     * Obtiene las referencias a los elementos de la UI de notificaciones.
     * Lectura dinámica para evitar problemas con DOM no cargado.
     * @returns {Object} Elementos del DOM
     */
    function getElements() {
        return {
            notifyBtn: document.getElementById('notifyBtn'),
            notifyBadge: document.getElementById('notifyBadge'),
            btnActivate: document.getElementById('btnActivateNotify'),
            notifyStatus: document.getElementById('notifyStatus')
        };
    }

    // ── Actualización de UI ─────────────────────────────────────────────

    /**
     * Actualiza la UI al estado "suscrito" (notificaciones activas).
     */
    function setUISubscribed() {
        var els = getElements();
        if (els.notifyBtn) els.notifyBtn.classList.add('subscribed');
        if (els.btnActivate) {
            els.btnActivate.innerHTML = '<i class="fa fa-check-circle"></i><span>Notificaciones Activas</span>';
            els.btnActivate.disabled = true;
            els.btnActivate.classList.add('btn-notify-subscribed');
        }
        if (els.notifyStatus) {
            els.notifyStatus.innerText = '✓ Notificaciones activadas';
            els.notifyStatus.style.color = '#4ade80';
        }
        if (els.notifyBadge) els.notifyBadge.classList.add('hidden');
    }

    /**
     * Actualiza la UI al estado "bloqueado".
     */
    function setUIBlocked() {
        var els = getElements();
        if (els.notifyStatus) {
            els.notifyStatus.innerText = '✗ Bloqueadas por el navegador';
            els.notifyStatus.style.color = '#f87171';
        }
        if (els.btnActivate) {
            els.btnActivate.innerHTML = '<i class="fa fa-ban"></i><span>Bloqueadas</span>';
            els.btnActivate.disabled = true;
            els.btnActivate.style.opacity = '0.5';
        }
    }

    /**
     * Actualiza la UI al estado "procesando" (spinner).
     */
    function setUIProcessing() {
        var els = getElements();
        if (els.btnActivate) {
            els.btnActivate.innerHTML = '<i class="fa fa-spinner fa-spin"></i><span>Activando...</span>';
            els.btnActivate.disabled = true;
        }
    }

    /**
     * Actualiza la UI al estado "default" (sin suscripción).
     */
    function setUIDefault() {
        var els = getElements();
        if (els.notifyStatus) els.notifyStatus.innerText = '';
        if (els.btnActivate) {
            els.btnActivate.innerHTML = '<i class="fa fa-bell"></i><span>Activar Notificaciones</span>';
            els.btnActivate.disabled = false;
            els.btnActivate.classList.remove('btn-notify-subscribed');
        }
    }

    /**
     * Actualiza la UI al estado "no soportado".
     */
    function setUINotSupported() {
        var els = getElements();
        if (els.notifyStatus) {
            els.notifyStatus.innerText = 'No soportado en este navegador';
            els.notifyStatus.style.color = 'rgba(255,255,255,0.4)';
        }
        if (els.btnActivate) els.btnActivate.style.display = 'none';
    }

    // ── Lógica de Firebase Cloud Messaging ───────────────────────────────

    /**
     * Guarda el token FCM en Firebase Realtime Database.
     * Permite al administrador enviar notificaciones desde Firebase Console.
     * @param {string} token - Token FCM del dispositivo
     */
    function saveTokenToDatabase(token) {
        try {
            var pushTokensRef = window.firebaseRefs && window.firebaseRefs.pushTokens;
            if (!pushTokensRef) {
                console.warn('⚠️ [Notify] pushTokens ref no disponible');
                return;
            }

            var tokenKey = hashToken(token);
            var tokenData = {
                token: token,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                userAgent: navigator.userAgent.substring(0, 150),
                language: navigator.language || 'es'
            };

            pushTokensRef.child(tokenKey).set(tokenData)
                .then(function () {
                    console.log('✅ [Notify] Token FCM guardado en RTDB');
                })
                .catch(function (error) {
                    console.error('❌ [Notify] Error al guardar token:', error);
                });

        } catch (error) {
            console.error('❌ [Notify] Error general al guardar token:', error);
        }
    }

    /**
     * Elimina un token FCM de Firebase RTDB (cuando se revoca el permiso).
     * @param {string} token - Token FCM a eliminar
     */
    function removeTokenFromDatabase(token) {
        try {
            var pushTokensRef = window.firebaseRefs && window.firebaseRefs.pushTokens;
            if (!pushTokensRef || !token) return;

            var tokenKey = hashToken(token);
            pushTokensRef.child(tokenKey).remove()
                .then(function () {
                    console.log('🗑️ [Notify] Token eliminado de RTDB');
                })
                .catch(function (error) {
                    console.error('❌ [Notify] Error al eliminar token:', error);
                });
        } catch (error) {
            console.error('❌ [Notify] Error al intentar eliminar token:', error);
        }
    }

    /**
     * Obtiene el token FCM del dispositivo actual.
     * Requiere que el Service Worker esté registrado y el permiso concedido.
     * @returns {Promise<string|null>} Token FCM o null si falla
     */
    function getFirebaseToken() {
        var messaging = window.firebaseMessaging;
        if (!messaging) {
            console.error('❌ [Notify] Firebase Messaging no inicializado');
            return Promise.resolve(null);
        }

        return messaging.getToken({ vapidKey: VAPID_KEY })
            .then(function (token) {
                if (token) {
                    currentToken = token;
                    // Guardar en localStorage para comparar después
                    try {
                        localStorage.setItem(TOKEN_STORAGE_KEY, token);
                    } catch (e) {
                        // localStorage no disponible
                    }
                    return token;
                } else {
                    console.warn('⚠️ [Notify] No se pudo obtener token FCM');
                    return null;
                }
            })
            .catch(function (error) {
                console.error('❌ [Notify] Error al obtener token FCM:', error);
                return null;
            });
    }

    /**
     * Configura el listener para mensajes recibidos en primer plano (foreground).
     * Cuando la app está abierta, FCM no muestra notificación automáticamente,
     * así que debemos mostrarla manualmente.
     */
    /**
     * Crea el contenedor de Toasts si no existe.
     */
    function ensureToastContainer() {
        if (!document.getElementById('toast-container')) {
            var container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    }

    /**
     * Reproduce un sonido de notificación sutil.
     */
    function playNotificationSound() {
        try {
            var audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play();
        } catch (e) {
            console.warn('⚠️ [Notify] El navegador bloqueó el sonido (falta interacción)');
        }
    }

    /**
     * Muestra una notificación visual premium dentro de la app (Toast).
     */
    function showToast(title, body, image, url) {
        ensureToastContainer();
        var container = document.getElementById('toast-container');
        
        var toast = document.createElement('div');
        toast.className = 'plr-toast';
        
        toast.innerHTML = `
            <div class="plr-toast-icon">
                <i class="fa fa-bell"></i>
            </div>
            <div class="plr-toast-content">
                <span class="plr-toast-title">${title}</span>
                <p class="plr-toast-body">${body}</p>
            </div>
        `;

        if (url) {
            toast.onclick = function() {
                window.open(url, '_blank');
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 500);
            };
        } else {
            toast.onclick = function() {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 500);
            };
        }

        container.appendChild(toast);
        
        // Animación de entrada
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Sonido
        playNotificationSound();

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 500);
            }
        }, 5000);
    }

    /**
     * Configura el listener para mensajes recibidos en primer plano (foreground).
     */
    function setupForegroundListener() {
        var messaging = window.firebaseMessaging;
        if (!messaging) return;

        messaging.onMessage(function (payload) {
            console.log('📩 [Notify] Mensaje recibido en foreground:', payload);

            var title = (payload.notification && payload.notification.title) || 'Puro Llano Radio';
            var body = (payload.notification && payload.notification.body) || 'Nueva actualización';
            var image = (payload.notification && payload.notification.image) || null;
            var url = (payload.data && payload.data.url) || null;

            // Mostrar aviso visual premium en lugar del nativo
            showToast(title, body, image, url);

            // Actualizar badge del botón de notificaciones
            var notifyBadge = document.getElementById('notifyBadge');
            if (notifyBadge) {
                var currentCount = parseInt(notifyBadge.textContent, 10) || 0;
                notifyBadge.textContent = currentCount + 1;
                notifyBadge.classList.remove('hidden');
            }
        });
    }

    /**
     * Verifica el estado actual de las notificaciones y actualiza la UI.
     */
    function checkNotificationStatus() {
        // Verificar soporte del navegador
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            setUINotSupported();
            return;
        }

        switch (Notification.permission) {
            case 'granted':
                // Verificar si tenemos token FCM guardado
                var savedToken = null;
                try {
                    savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
                } catch (e) {
                    // localStorage no disponible
                }

                if (savedToken) {
                    currentToken = savedToken;
                    setUISubscribed();
                } else {
                    // Permiso concedido pero sin token, intentar obtenerlo
                    getFirebaseToken().then(function (token) {
                        if (token) {
                            saveTokenToDatabase(token);
                            setUISubscribed();
                        } else {
                            setUIDefault();
                        }
                    });
                }
                break;

            case 'denied':
                setUIBlocked();
                break;

            default:
                setUIDefault();
                break;
        }
    }

    // ── Funciones Globales (expuestas a la UI) ──────────────────────────

    /**
     * Solicita permiso de notificaciones y suscribe al usuario vía FCM.
     * Se ejecuta al hacer clic en "Activar Notificaciones".
     */
    function subscribeNotifications() {
        // Verificar soporte
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            setUINotSupported();
            return;
        }

        setUIProcessing();

        // Solicitar permiso al navegador
        Notification.requestPermission()
            .then(function (permission) {
                if (permission === 'granted') {
                    console.log('✅ [Notify] Permiso concedido');

                    // Obtener token FCM
                    return getFirebaseToken().then(function (token) {
                        if (token) {
                            // Guardar en la base de datos
                            saveTokenToDatabase(token);
                            setUISubscribed();

                            // Mostrar notificación de confirmación
                            try {
                                new Notification('Puro Llano Radio 🤠', {
                                    body: '¡Notificaciones activadas con éxito! 🎵',
                                    icon: NOTIFICATION_ICON,
                                    tag: 'plr-welcome'
                                });
                            } catch (e) {
                                console.warn('⚠️ [Notify] No se pudo mostrar confirmación');
                            }

                            console.log('✅ [Notify] Suscripción FCM completada');
                        } else {
                            console.error('❌ [Notify] No se obtuvo token FCM');
                            setUIDefault();
                        }
                    });
                } else if (permission === 'denied') {
                    setUIBlocked();
                    console.warn('⚠️ [Notify] Permiso denegado por el usuario');
                } else {
                    setUIDefault();
                }
            })
            .catch(function (error) {
                console.error('❌ [Notify] Error al solicitar permiso:', error);
                setUIDefault();
            });
    }

    // ── GESTIÓN DE LA BANDEJA DE ENTRADA (INBOX) ───────────────────────

    /** @type {number} Contador de notificaciones no leídas */
    var unreadCount = 0;

    /**
     * Carga el historial de notificaciones desde Firebase RTDB en tiempo real.
     */
    function loadNotificationHistory() {
        var histRef = window.firebaseRefs && window.firebaseRefs.notificationsHistory;
        if (!histRef) {
            console.warn('⚠️ [Notify] notificationsHistory ref no disponible');
            return;
        }

        var inboxContent = document.getElementById('notifyInboxContent');
        if (!inboxContent) return;

        // Escuchar las últimas 20 notificaciones
        histRef.orderByChild('timestamp').limitToLast(20).on('value', function (snapshot) {
            var notifications = [];
            snapshot.forEach(function (childSnap) {
                var data = childSnap.val();
                data.id = childSnap.key;
                notifications.push(data);
            });

            // Ordenar de más reciente a más antigua
            notifications.reverse();

            renderInbox(notifications);
        });
    }

    /**
     * Renderiza las notificaciones en el panel HTML.
     * @param {Array} notifications - Lista de notificaciones
     */
    function renderInbox(notifications) {
        var inboxContent = document.getElementById('notifyInboxContent');
        var notifyBadge = document.getElementById('notifyBadge');
        if (!inboxContent) return;

        if (notifications.length === 0) {
            inboxContent.innerHTML = `
                <div class="notify-empty-state">
                    <i class="fa fa-box-open"></i>
                    <p>No hay notificaciones por ahora.</p>
                </div>
            `;
            if (notifyBadge) {
                notifyBadge.textContent = '0';
                notifyBadge.classList.add('hidden');
            }
            return;
        }

        var html = '';
        var lastReadTime = parseInt(localStorage.getItem('plr_notify_last_read') || '0', 10);
        var newUnreadCount = 0;

        notifications.forEach(function (notif) {
            var isUnread = notif.timestamp > lastReadTime;
            if (isUnread) newUnreadCount++;

            var timeString = new Date(notif.timestamp).toLocaleString('es-VE', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            var imageHtml = notif.image ? `<img src="${notif.image}" class="notify-item-image" alt="Imagen de notificación">` : '';
            var linkHtml = notif.url ? `<a href="${notif.url}" target="_blank" class="notify-item-link">Ver más <i class="fa fa-external-link-alt"></i></a>` : '';

            html += `
                <div class="notify-item ${isUnread ? 'unread' : ''}">
                    <div class="notify-item-header">
                        <h5 class="notify-item-title">${notif.title || 'Notificación'}</h5>
                        <span class="notify-item-time">${timeString}</span>
                    </div>
                    <p class="notify-item-body">${notif.body || ''}</p>
                    ${imageHtml}
                    ${linkHtml}
                </div>
            `;
        });

        inboxContent.innerHTML = html;

        // Actualizar contador visual
        if (notifyBadge) {
            unreadCount = newUnreadCount;
            notifyBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            if (unreadCount > 0) {
                notifyBadge.classList.remove('hidden');
            } else {
                notifyBadge.classList.add('hidden');
            }
        }
    }

    /**
     * Abre/Cierra el panel de la bandeja de notificaciones.
     * Marca todas como leídas al abrirse.
     */
    /**
     * Marca todas las notificaciones localmente como leídas.
     */
    function markAllAsRead() {
        localStorage.setItem('plr_notify_last_read', Date.now().toString());
        var notifyBadge = document.getElementById('notifyBadge');
        if (notifyBadge) notifyBadge.classList.add('hidden');
        
        var unreadItems = document.querySelectorAll('.notify-item.unread');
        unreadItems.forEach(function(item) {
            item.classList.remove('unread');
        });
        
        console.log('✅ [Notify] Todas las notificaciones marcadas como leídas');
    }

    /**
     * Abre/Cierra el panel de la bandeja de notificaciones.
     */
    function toggleNotifyInbox() {
        var inboxPanel = document.getElementById('notifyInboxPanel');
        if (!inboxPanel) return;

        var isOpen = inboxPanel.classList.contains('open');

        if (isOpen) {
            inboxPanel.classList.remove('open');
        } else {
            inboxPanel.classList.add('open');
            // Al abrir, marcamos como leídas automáticamente
            markAllAsRead();
        }
    }

    // ── Exponer funciones globalmente ────────────────────────────────────
    window.subscribeNotifications = subscribeNotifications;
    window.toggleNotifyInbox = toggleNotifyInbox;
    window.markAllAsRead = markAllAsRead;

    // ── Inicialización (Singleton) ──────────────────────────────────────

    /**
     * Inicializa el módulo de notificaciones FCM.
     * Espera a que Firebase y el Service Worker estén disponibles.
     */
    function initNotifications() {
        if (isInitialized) return;
        isInitialized = true;

        // Verificar soporte básico
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setUINotSupported();
            console.warn('⚠️ [Notify] Push Notifications no soportadas');
            return;
        }

        // Verificar estado actual
        checkNotificationStatus();

        // Cargar historial de notificaciones en el buzón
        loadNotificationHistory();

        // Configurar listener de foreground
        setupForegroundListener();

        // Monitorear cambios de token (FCM puede rotar tokens)
        var messaging = window.firebaseMessaging;
        if (messaging) {
            // Verificar/renovar token periódicamente (cada hora)
            setInterval(function () {
                if (Notification.permission === 'granted' && currentToken) {
                    getFirebaseToken().then(function (newToken) {
                        if (newToken && newToken !== currentToken) {
                            console.log('🔄 [Notify] Token FCM renovado');
                            removeTokenFromDatabase(currentToken);
                            saveTokenToDatabase(newToken);
                            currentToken = newToken;
                        }
                    });
                }
            }, 3600000); // 1 hora
        }

        console.log('🔔 [Notify] Sistema de notificaciones FCM inicializado');
    }

    // ── Arranque ────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            // Esperar a que Firebase esté listo
            setTimeout(initNotifications, 2000);
        });
    } else {
        setTimeout(initNotifications, 2000);
    }

})();
