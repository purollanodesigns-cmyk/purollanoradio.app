/* ==========================================================================
   PURO LLANO RADIO - CHAT EN TIEMPO REAL (EMBEDDED PANEL)
   Archivo: chat-script.js
   
   Patrón: Module Pattern con Singleton para gestión del estado del chat.
   Todas las funciones expuestas al HTML se registran en window.* al final.
   
   Seguridad:
   - XSS Prevention: Todo texto del usuario pasa por escapeChatHtml()
   - No hay credenciales hardcoded (Firebase config vive en firebase.js)
   - Sanitización de inputs antes de escribir a Firebase
   ========================================================================== */

// ==========================================================================
// VARIABLES GLOBALES (Estado del Singleton)
// ==========================================================================

/** @type {string|null} Nombre del usuario actual */
let chatUser = null;

/** @type {string|null} ID único del usuario actual */
let chatUserId = null;

/** @type {firebase.database.Database|null} Instancia de la base de datos */
let chatDb = null;

/** @type {firebase.database.Reference|null} Referencia a /chat/messages */
let chatMessagesRef = null;

/** @type {firebase.database.Reference|null} Referencia a /chat/users */
let chatUsersRef = null;

/** @type {firebase.database.Reference|null} Referencia a /chat/presence */
let chatPresenceRef = null;

/** @type {firebase.database.Reference|null} Referencia a /chat/typing */
let chatTypingRef = null;

/** @type {firebase.database.Reference|null} Ref de presencia del usuario actual */
let chatUserPresence = null;

/** @type {number|null} Timeout para detener el indicador de escritura */
let chatTypingTimeout = null;

/** @type {boolean} Flag de estado de escritura del usuario actual */
let chatIsTyping = false;

/** @type {Map<string, Object>} Mapa de usuarios en línea */
let onlineChatUsers = new Map();

/** @type {number} Contador de mensajes no leídos (badge) */
let chatUnreadCount = 0;

/** @type {boolean} Flag indicando si el sistema fue inicializado */
let chatInitialized = false;

/** @type {boolean} Flag para evitar contar mensajes antiguos en el badge */
let isChatInitialBatch = true;

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

/**
 * Punto de entrada: espera que el DOM esté listo y luego
 * inicializa el sistema de chat con un retardo de 1s para
 * asegurar que Firebase se haya cargado.
 */
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(initChatSystem, 1000);

    // Actualizar contador de caracteres en tiempo real
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', function () {
            const charCountEl = document.getElementById('chatCharCount');
            if (charCountEl) {
                charCountEl.innerText = this.value.length;
            }
        });
    }
});

// ==========================================================================
// INICIALIZAR SISTEMA DE CHAT
// ==========================================================================

/**
 * Inicializa Firebase Database y verifica si el usuario
 * ya tiene sesión guardada en localStorage.
 * Si la tiene, oculta el modal y configura listeners.
 * Si no la tiene, muestra el modal de bienvenida.
 */
function initChatSystem() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase no disponible');
            return;
        }

        // Inicializar Firebase si no está inicializado
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        chatDb = firebase.database();
        chatMessagesRef = chatDb.ref('chat/messages');
        chatUsersRef = chatDb.ref('chat/users');
        chatPresenceRef = chatDb.ref('chat/presence');
        chatTypingRef = chatDb.ref('chat/typing');

        console.log('✅ Chat Firebase inicializado (Panel Embebido)');

        // Verificar si ya tiene usuario guardado
        const savedUsername = localStorage.getItem('chatUsername');
        const savedUserId = localStorage.getItem('chatUserId');

        if (savedUsername && savedUserId) {
            chatUser = savedUsername;
            chatUserId = savedUserId;

            // Ocultar modal de bienvenida
            const modal = document.getElementById('chatWelcomeModal');
            if (modal) modal.style.display = 'none';

            // Configurar presencia y listeners
            setupChatPresence();
            setupChatListeners();
        } else {
            // No mostrar nada al cargar la página.
            // El modal de bienvenida se mostrará solo cuando el usuario
            // haga clic en el icono del chat (ver toggleChatInterno).
            const loading = document.getElementById('chatLoading');
            if (loading) {
                loading.innerHTML = '<i class="fa fa-info-circle"></i><p>Únete para ver los mensajes</p>';
            }
        }

        chatInitialized = true;
        
        // Mostrar la llamada a la interacción (CTA) después de 3 segundos
        setTimeout(() => {
            const chatCTA = document.getElementById('chatCTA');
            if (chatCTA && chatUnreadCount === 0) {
                chatCTA.classList.remove('hidden');
                chatCTA.classList.add('active'); // Clase para animación si existe
            }
        }, 3000);

    } catch (error) {
        console.error('❌ Error inicializando chat:', error);
        showChatToast('Error de conexión al chat');
    }
}

// ==========================================================================
// GESTIÓN DE USUARIOS
// ==========================================================================

/**
 * Genera un ID único para el usuario combinando
 * un string aleatorio con el timestamp actual.
 * @returns {string} ID único del usuario
 */
function generateChatUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * Maneja el flujo de unirse al chat desde el modal de bienvenida interno.
 */
function joinChatInterno() {
    const usernameInput = document.getElementById('chatWelcomeUsername');
    if (!usernameInput) return;

    const username = usernameInput.value.trim();

    if (!username) {
        showChatToast('⚠️ Por favor ingresa un nombre');
        return;
    }

    if (username.length < 2) {
        showChatToast('⚠️ El nombre debe tener al menos 2 caracteres');
        return;
    }

    if (username.length > 20) {
        showChatToast('⚠️ El nombre no puede exceder 20 caracteres');
        return;
    }

    chatUser = username;
    chatUserId = generateChatUserId();

    // Guardar en localStorage para sesiones futuras
    localStorage.setItem('chatUsername', chatUser);
    localStorage.setItem('chatUserId', chatUserId);

    // Ocultar modal de bienvenida
    const modal = document.getElementById('chatWelcomeModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }

    // Configurar presencia y listeners de chat
    setupChatPresence();
    setupChatListeners();

    // Abrir el panel de chat automáticamente tras registrarse
    const panel = document.getElementById('chatPanelInterno');
    const btn = document.getElementById('floatingChatBtn');
    if (panel && !panel.classList.contains('active')) {
        panel.classList.add('active');
        if (btn) btn.classList.add('active');
        setTimeout(scrollChatToBottom, 300);
    }

    // Enviar mensaje de sistema anunciando la entrada del usuario
    addSystemMessage(`🤠 ${chatUser} se ha unido al chat`);

    showChatToast(`¡Bienvenido ${chatUser}!`);
}

/**
 * Registra la presencia del usuario en Firebase.
 */
function setupChatPresence() {
    if (!chatUserId || !chatPresenceRef) return;

    const userPresenceRef = chatPresenceRef.child(chatUserId);

    const presenceData = {
        userId: chatUserId,
        username: chatUser,
        online: true,
        lastSeen: Date.now(),
        avatar: generateChatAvatarColor(chatUserId)
    };

    userPresenceRef.set(presenceData);

    // Heartbeat: actualizar lastSeen cada 30 segundos
    setInterval(() => {
        if (chatUserId) {
            userPresenceRef.update({ lastSeen: Date.now() });
        }
    }, 30000);

    // Limpiar presencia al cerrar la pestaña/ventana
    window.addEventListener('beforeunload', () => {
        userPresenceRef.remove();
    });

    chatUserPresence = userPresenceRef;
}

/**
 * Configura todos los listeners de Firebase en tiempo real.
 */
function setupChatListeners() {
    listenToChatMessages();
    listenToChatOnlineUsers();
    listenToChatTyping();
    setupChatTypingDetection();
}

// ==========================================================================
// ESCUCHAR USUARIOS EN LÍNEA
// ==========================================================================

function listenToChatOnlineUsers() {
    if (!chatPresenceRef) return;

    chatPresenceRef.on('value', (snapshot) => {
        const users = snapshot.val() || {};
        onlineChatUsers.clear();

        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);

        Object.values(users).forEach(user => {
            if (user.lastSeen > fiveMinutesAgo) {
                onlineChatUsers.set(user.userId, user);
            }
        });

        updateChatOnlineCount();
        renderChatUsersList();
    });
}

function updateChatOnlineCount() {
    const count = onlineChatUsers.size;
    const onlineCountEl = document.getElementById('chatOnlineCount');
    const usersBadgeEl = document.getElementById('chatUsersBadge');

    if (onlineCountEl) onlineCountEl.innerText = count;
    if (usersBadgeEl) usersBadgeEl.innerText = count;
}

function renderChatUsersList() {
    const usersList = document.getElementById('chatUsersList');
    if (!usersList) return;

    if (onlineChatUsers.size === 0) {
        usersList.innerHTML = `
            <div class="users-empty">
                <i class="fa fa-users-slash"></i>
                <p>No hay usuarios en línea</p>
            </div>
        `;
        return;
    }

    let html = '';
    onlineChatUsers.forEach((user, userId) => {
        const isCurrentUser = userId === chatUserId;
        const timeAgo = getChatTimeAgo(user.lastSeen);

        html += `
            <div class="user-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="user-avatar" style="background: ${user.avatar || '#667eea'}">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <div class="user-info">
                    <span class="user-name">${escapeChatHtml(user.username)}${isCurrentUser ? ' (Tú)' : ''}</span>
                    <span class="user-status">${isCurrentUser ? 'En línea' : timeAgo}</span>
                </div>
                ${!isCurrentUser ? `
                    <button class="user-action-btn" onclick="mentionChatUser('${escapeChatHtml(user.username)}')" title="Mencionar">
                        <i class="fa fa-at"></i>
                    </button>
                ` : ''}
            </div>
        `;
    });

    usersList.innerHTML = html;
}

// ==========================================================================
// MENSAJES
// ==========================================================================

function listenToChatMessages() {
    if (!chatMessagesRef) return;

    chatMessagesRef.limitToLast(50).on('child_added', (snapshot) => {
        const message = snapshot.val();
        if (message) {
            message._firebaseKey = snapshot.key;
            displayChatMessage(message);
        }
    });

    // Una vez procesados los existentes, desactivar flag de carga inicial
    chatMessagesRef.limitToLast(1).once('value', () => {
        setTimeout(() => { isChatInitialBatch = false; }, 1000);
    });
}

function displayChatMessage(message) {
    const messagesContainer = document.getElementById('chatMessagesInterno');
    if (!messagesContainer) return;

    // Remover mensaje de carga si existe
    const loadingMsg = messagesContainer.querySelector('.messages-loading');
    if (loadingMsg) loadingMsg.remove();

    const isOwnMessage = message.userId === chatUserId;
    const messageTime = formatChatMessageTime(message.timestamp);

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isOwnMessage ? 'own-message' : ''}`;
    messageDiv.dataset.messageId = message.id || Date.now();
    messageDiv.dataset.firebaseKey = message._firebaseKey || '';

    let messageContent = escapeChatHtml(message.text);
    messageContent = parseChatMentions(messageContent);

    messageDiv.innerHTML = `
        <div class="chat-message-avatar" style="background: ${message.avatar || '#667eea'}">
            ${message.username.charAt(0).toUpperCase()}
        </div>
        <div class="chat-message-content">
            <div class="chat-message-header">
                <span class="chat-message-author">${escapeChatHtml(message.username)}</span>
                <span class="chat-message-time">${messageTime}</span>
            </div>
            <div class="chat-message-text">${messageContent}</div>
            ${message.type === 'system' ? '' : `
                <div class="chat-message-actions">
                    <button class="action-btn" onclick="mentionChatUser('${escapeChatHtml(message.username)}')" title="Mencionar">
                        <i class="fa fa-at"></i>
                    </button>
                </div>
            `}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);

    // Auto-scroll al fondo si el usuario está cerca del fondo
    const isNearBottom = isChatUserNearBottom();
    if (isNearBottom || isOwnMessage) {
        setTimeout(scrollChatToBottom, 100);
    }
    
    // Gestión del badge de notificaciones
    if (!isOwnMessage && message.type !== 'system' && !isChatInitialBatch) {
        const panel = document.getElementById('chatPanelInterno');
        if (!panel.classList.contains('active')) {
            chatUnreadCount++;
            updateChatBadge();
        }
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    const text = input.value.trim();

    if (!text) {
        showChatToast('⚠️ Escribe un mensaje');
        return;
    }

    if (text.length > 500) {
        showChatToast('⚠️ El mensaje excede 500 caracteres');
        return;
    }

    if (!chatUser || !chatUserId) {
        showChatToast('⚠️ Debes unirte al chat primero');
        return;
    }

    // El envío se realiza mediante el Worker; Firebase cliente queda solo para lectura.
    const endpoint = window.CHAT_MESSAGE_ENDPOINT;
    if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint)) {
        showChatToast('⚠️ El chat necesita configuración del servidor');
        console.error('Configura window.CHAT_MESSAGE_ENDPOINT con la URL real del Worker.');
        return;
    }

    input.disabled = true;
    fetch(endpoint.replace(/\/$/, '') + '/chat-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: chatUser, userId: chatUserId, text })
    })
        .then(async response => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.ok) throw new Error(data.error || 'No se pudo enviar');
            input.value = '';
            const charCountEl = document.getElementById('chatCharCount');
            if (charCountEl) charCountEl.innerText = '0';
            stopChatTyping();
        })
        .catch(error => {
            console.error('Error enviando mensaje al Worker:', error);
            showChatToast('⚠️ No se pudo enviar. Intenta de nuevo.');
        })
        .finally(() => {
            input.disabled = false;
            input.focus();
        });
}

function addSystemMessage(text) {
    // No insertar mensajes de sistema desde el navegador: un cliente no debe
    // poder hacerse pasar por el servidor. Se conserva la función por compatibilidad.
    console.info('[Chat] Aviso local:', String(text).slice(0, 160));
}

function deleteChatMessage(buttonElement) {
    if (!buttonElement) return;

    // Subir al elemento padre .chat-message
    const messageDiv = buttonElement.closest('.chat-message');
    if (!messageDiv) return;

    const firebaseKey = messageDiv.dataset.firebaseKey;
    if (!firebaseKey) {
        showChatToast('⚠️ No se pudo identificar el mensaje');
        return;
    }

    if (confirm('¿Eliminar este mensaje?')) {
        chatMessagesRef.child(firebaseKey).remove()
            .then(() => {
                messageDiv.remove();
                showChatToast('Mensaje eliminado');
            })
            .catch((error) => {
                console.error('Error eliminando mensaje:', error);
                showChatToast('⚠️ Error al eliminar el mensaje');
            });
    }
}

// ==========================================================================
// TYPING INDICATOR
// ==========================================================================

function setupChatTypingDetection() {
    const input = document.getElementById('chatInput');
    if (!input) return;

    input.addEventListener('input', () => {
        if (!chatTypingRef || !chatUserId) return;

        if (!chatIsTyping) {
            chatIsTyping = true;
            chatTypingRef.child(chatUserId).set({
                userId: chatUserId,
                username: chatUser,
                timestamp: Date.now()
            });
        }

        clearTimeout(chatTypingTimeout);
        chatTypingTimeout = setTimeout(() => {
            stopChatTyping();
        }, 2000);
    });

    input.addEventListener('blur', () => {
        stopChatTyping();
    });
}

function stopChatTyping() {
    if (!chatTypingRef || !chatUserId) return;

    chatTypingRef.child(chatUserId).remove();
    chatIsTyping = false;
}

function listenToChatTyping() {
    if (!chatTypingRef) return;

    chatTypingRef.on('value', (snapshot) => {
        const typingUsers = snapshot.val() || {};
        const typingList = Object.values(typingUsers)
            .filter(u => u.userId !== chatUserId)
            .map(u => u.username);

        const indicator = document.getElementById('chatTypingIndicator');
        if (!indicator) return;

        if (typingList.length === 0) {
            indicator.innerText = '';
        } else if (typingList.length === 1) {
            indicator.innerText = `${typingList[0]} está escribiendo...`;
        } else if (typingList.length === 2) {
            indicator.innerText = `${typingList.join(' y ')} están escribiendo...`;
        } else {
            indicator.innerText = 'Varias personas están escribiendo...';
        }
    });
}

// ==========================================================================
// PANELES DE LADO/TOGGLERS PARA index.html
// ==========================================================================

function toggleChatInterno() {
    const panel = document.getElementById('chatPanelInterno');
    const btn = document.getElementById('floatingChatBtn');
    if (!panel) return;

    // Si el usuario NO está registrado y está intentando ABRIR el chat,
    // mostrar el modal de bienvenida en vez del panel.
    const hasSession = localStorage.getItem('chatUsername') && localStorage.getItem('chatUserId');
    if (!panel.classList.contains('active') && !chatUser && !hasSession) {
        const modal = document.getElementById('chatWelcomeModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
        return;
    }

    panel.classList.toggle('active');

    if (panel.classList.contains('active')) {
        if (btn) btn.classList.add('active');
        
        // Reset unread counts when opened
        chatUnreadCount = 0;
        updateChatBadge();
        
        setTimeout(() => {
            scrollChatToBottom();
            // Enfocar input en escritorio
            if (window.innerWidth > 1024) {
                const input = document.getElementById('chatInput');
                if (input) input.focus();
            }
        }, 300);

        // Cerrar menú lateral (sidebar principal de la radio) si está abierto
        const mainSidebar = document.getElementById('mainSidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (mainSidebar && mainSidebar.classList.contains('active')) {
            mainSidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        }
    } else {
        if (btn) btn.classList.remove('active');
        updateChatBadge();
    }
}

function toggleChatUsers() {
    const panel = document.getElementById('chatUsersPanel');
    if (!panel) return;

    panel.classList.toggle('active');
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPickerInterno');
    if (!picker) return;

    picker.classList.toggle('active');
}

function insertEmojiChat(emoji) {
    const input = document.getElementById('chatInput');
    if (!input) return;

    input.value += emoji;
    input.focus();

    const charCountEl = document.getElementById('chatCharCount');
    if (charCountEl) charCountEl.innerText = input.value.length;

    // Cerrar el panel picker después de insertar
    const picker = document.getElementById('emojiPickerInterno');
    if (picker) picker.classList.remove('active');
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function mentionChatUser(username) {
    const input = document.getElementById('chatInput');
    if (!input) return;

    input.value += `@${username} `;
    input.focus();

    const usersPanel = document.getElementById('chatUsersPanel');
    if (usersPanel) usersPanel.classList.remove('active');
}

// ==========================================================================
// SCROLL Y UI UPDATES
// ==========================================================================

function scrollChatToBottom() {
    const container = document.getElementById('chatMessagesInterno');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function isChatUserNearBottom() {
    const container = document.getElementById('chatMessagesInterno');
    if (!container) return true;

    const threshold = 100;
    const position = container.scrollTop + container.clientHeight;
    const height = container.scrollHeight;
    return position > height - threshold;
}

function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    const menuBadge = document.getElementById('menuChatBadge');
    const chatCTA = document.getElementById('chatCTA');
    const panel = document.getElementById('chatPanelInterno');
    const isPanelActive = panel && panel.classList.contains('active');

    const countText = chatUnreadCount > 99 ? '99+' : chatUnreadCount.toString();
    const displayBadge = chatUnreadCount > 0 ? 'inline-block' : 'none';

    if (badge) {
        badge.innerText = countText;
        badge.style.display = displayBadge;
    }
    if (menuBadge) {
        menuBadge.innerText = countText;
        menuBadge.style.display = displayBadge;
    }

    // Visibilidad de la CTA: se oculta si el chat está abierto o si hay mensajes nuevos
    if (chatCTA) {
        if (chatUnreadCount > 0 || isPanelActive) {
            chatCTA.classList.add('hidden');
        } else {
            chatCTA.classList.remove('hidden');
        }
    }
}

// ==========================================================================
// UTILIDADES
// ==========================================================================

function generateChatAvatarColor(userId) {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function formatChatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    }

    if (diff < 48 * 60 * 60 * 1000) {
        return 'Ayer ' + date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getChatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
    return 'Hace más de 1d';
}

function escapeChatHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function parseChatMentions(text) {
    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
}

function showChatToast(message) {
    const toast = document.getElementById('chatToast');
    const toastMessage = document.getElementById('chatToastMessage');

    if (!toast || !toastMessage) return;

    toastMessage.innerText = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==========================================================================
// REGISTRO DE FUNCIONES GLOBALES (ACCESIBLES DESDE INDEX.HTML)
// ==========================================================================
window.joinChatInterno = joinChatInterno;
window.toggleChatInterno = toggleChatInterno;
window.toggleChatUsers = toggleChatUsers;
window.toggleEmojiPicker = toggleEmojiPicker;
window.insertEmojiChat = insertEmojiChat;
window.handleChatKeyPress = handleChatKeyPress;
window.sendChatMessage = sendChatMessage;
window.mentionChatUser = mentionChatUser;
window.deleteChatMessage = deleteChatMessage;
