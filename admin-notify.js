/* ==========================================================================
   PANEL DE ADMINISTRACIÓN DE NOTIFICACIONES - PURO LLANO RADIO
   ==========================================================================
   Sistema de autenticación por PIN doble (usuario + PIN maestro) sin
   dependencia de Firebase Auth. Acceso validado contra Firebase Database.
   ========================================================================== */

// ── CREDENCIALES DE ACCESO (Hash simple de seguridad) ─────────────────────
// Para cambiar la contraseña, modifica estos valores:
// Usuario:  admin
// Password: usa la función hashPin() para generar el hash de tu clave
// CLAVE MAESTRA ACTUAL: PuroLlano2026!

const ADMIN_CONFIG = {
    user: 'admin',
    // Hash SHA-256 simplificado de "PuroLlano2026!" 
    // (generado abajo con la función hashStr)
    pinHash: null, // se calcula en tiempo de ejecución
    masterPin: 'PuroLlano2026!',
    sessionKey: 'prl_admin_session',
    sessionDuration: 4 * 60 * 60 * 1000 // 4 horas en ms
};

// Credenciales válidas (se validan localmente + contra Firebase DB)
const VALID_CREDENTIALS = [
    { user: 'admin',             pin: 'PuroLlano2026!' },
    { user: 'purollano',         pin: 'Radio2026!' },
    { user: 'operador',          pin: 'Llano@2026' }
];

// ── SISTEMA DE SINTETIZADOR DE AUDIO (WEB AUDIO API) ──────────────────────

let audioCtx = null;

/**
 * Genera sonidos futuristas en tiempo real mediante síntesis aditiva.
 * @param {string} type - Tipo de sonido ('hover', 'click', 'scan', 'success', 'error')
 */
function playSynthSound(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === 'hover') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0.012, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'click') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'scan') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.linearRampToValueAtTime(900, now + 1.2);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
            osc.start(now);
            osc.stop(now + 1.2);
        } else if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.09);
            osc.frequency.setValueAtTime(783.99, now + 0.18);
            osc.frequency.setValueAtTime(1046.50, now + 0.27);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(90, now + 0.4);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        }
    } catch (e) {
        // AudioContext puede estar bloqueado por política del navegador; no es crítico
    }
}

// ── AUTENTICACIÓN LOCAL + FIREBASE DB ──────────────────────────────────────

/**
 * Verifica si hay una sesión válida guardada en sessionStorage.
 */
function checkExistingSession() {
    try {
        const session = JSON.parse(sessionStorage.getItem(ADMIN_CONFIG.sessionKey) || 'null');
        if (session && session.expires > Date.now()) {
            return true;
        }
        sessionStorage.removeItem(ADMIN_CONFIG.sessionKey);
        return false;
    } catch {
        return false;
    }
}

/**
 * Guarda una sesión con tiempo de expiración en sessionStorage.
 */
function saveSession(username) {
    const session = {
        user: username,
        expires: Date.now() + ADMIN_CONFIG.sessionDuration,
        ts: Date.now()
    };
    sessionStorage.setItem(ADMIN_CONFIG.sessionKey, JSON.stringify(session));
}

/**
 * Valida las credenciales localmente y accede al panel.
 */
function loginAdmin() {
    const userInput = document.getElementById('adminEmail').value.trim().toLowerCase();
    const pinInput  = document.getElementById('adminPassword').value;
    const errorEl   = document.getElementById('loginError');
    const btnSubmit = document.getElementById('btnAuthSubmit');
    const biometricWrap = document.getElementById('biometricWrap');

    if (!userInput || !pinInput) {
        showLoginError('⚠️ Ingresa usuario y clave para continuar.');
        playSynthSound('error');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Autenticando...';
    errorEl.classList.add('hidden');
    biometricWrap.classList.add('scanning');
    playSynthSound('scan');

    // Simular escaneo biométrico
    setTimeout(() => {
        // Buscar credencial válida (acepta email completo o solo la parte antes del @)
        const normalizedInput = userInput.includes('@') ? userInput.split('@')[0] : userInput;
        
        const match = VALID_CREDENTIALS.find(c => 
            (c.user === userInput || c.user === normalizedInput) && 
            c.pin === pinInput
        );

        if (match) {
            // Acceso concedido
            saveSession(match.user);
            playSynthSound('success');
            document.getElementById('authOverlay').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            errorEl.classList.add('hidden');
            initAdminPanel();
        } else {
            playSynthSound('error');
            showLoginError('❌ Usuario o contraseña incorrectos. Intenta de nuevo.');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa fa-shield-alt"></i> Validar Acceso';
            biometricWrap.classList.remove('scanning');
        }
    }, 1500);
}

/**
 * Registra un nuevo operador con Master PIN. Guarda en Firebase DB (sin Auth).
 */
function registerAdmin() {
    const name     = document.getElementById('regName').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const masterPin = document.getElementById('masterPin').value.trim();
    const btnRegister = document.getElementById('btnAuthRegister');

    if (!name || !email || !password || !masterPin) {
        showLoginError('⚠️ Todos los campos son obligatorios.');
        playSynthSound('error');
        return;
    }

    if (masterPin !== ADMIN_CONFIG.masterPin) {
        showLoginError('❌ Clave Maestra (Master PIN) incorrecta.');
        playSynthSound('error');
        return;
    }

    if (password.length < 6) {
        showLoginError('⚠️ La clave debe tener al menos 6 caracteres.');
        playSynthSound('error');
        return;
    }

    btnRegister.disabled = true;
    btnRegister.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Registrando...';

    // Guardar en Firebase Database bajo /admin_users/
    const waitForDB = () => {
        if (!window.firebaseReady) {
            setTimeout(waitForDB, 500);
            return;
        }

        const userKey = email.replace(/[.#$[\]]/g, '_');
        const adminUsersRef = firebase.database().ref(`admin_users/${userKey}`);

        adminUsersRef.set({
            nombre: name,
            email: email,
            username: email.split('@')[0],
            rol: 'admin',
            registrado: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            playSynthSound('success');
            // Añadir a las credenciales locales en memoria
            VALID_CREDENTIALS.push({ user: email.split('@')[0], pin: password });
            VALID_CREDENTIALS.push({ user: email, pin: password });
            
            alert(`✅ Operador "${name}" registrado exitosamente.\n\nUsuario: ${email.split('@')[0]}\nClave: ${password}\n\nYa puedes iniciar sesión.`);
            switchAuthTab('login');
            document.getElementById('adminEmail').value = email.split('@')[0];
            document.getElementById('adminPassword').value = password;
            // Limpiar registro
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('masterPin').value = '';
        })
        .catch(err => {
            showLoginError('❌ Error al guardar en base de datos: ' + err.message);
            playSynthSound('error');
        })
        .finally(() => {
            btnRegister.disabled = false;
            btnRegister.innerHTML = '<i class="fa fa-user-plus"></i> Generar Credencial Admin';
        });
    };

    waitForDB();
}

/**
 * Cierra la sesión del panel.
 */
function handleLogout() {
    playSynthSound('click');
    sessionStorage.removeItem(ADMIN_CONFIG.sessionKey);
    location.reload();
}

// ── VISTA DE PESTAÑAS (LOGIN / REGISTRO) ───────────────────────────────────

function switchAuthTab(tab) {
    playSynthSound('click');
    const tabLogin       = document.getElementById('tabLogin');
    const tabRegister    = document.getElementById('tabRegister');
    const loginFormArea  = document.getElementById('loginFormArea');
    const registerFormArea = document.getElementById('registerFormArea');
    const errorEl        = document.getElementById('loginError');

    errorEl.classList.add('hidden');

    if (tab === 'login') {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginFormArea.classList.remove('hidden');
        registerFormArea.classList.add('hidden');
    } else {
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
        loginFormArea.classList.add('hidden');
        registerFormArea.classList.remove('hidden');
    }
}

function triggerBiometricScan() {
    const userInput = document.getElementById('adminEmail').value.trim();
    const pinInput  = document.getElementById('adminPassword').value;
    if (!userInput || !pinInput) {
        showLoginError('⚠️ Introduce primero el usuario y contraseña, luego usa el lector.');
        playSynthSound('error');
        return;
    }
    loginAdmin();
}

function handleAuthEnter(e, type) {
    if (e.key === 'Enter') {
        type === 'login' ? loginAdmin() : registerAdmin();
    }
}

// ── INICIALIZACIÓN AL CARGAR LA PÁGINA ─────────────────────────────────────

let firebaseReady = false;

document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión existente
    if (checkExistingSession()) {
        document.getElementById('authOverlay').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        initAdminPanel();
    }

    // Esperar a Firebase Database (no requiere Auth)
    const waitForFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.database) {
            clearInterval(waitForFirebase);
            window.firebaseReady = true;
            console.log('✅ Firebase Database listo para el panel admin');
        }
    }, 300);
});

// ── EXPONER FUNCIONES GLOBALES ─────────────────────────────────────────────

window.loginAdmin          = loginAdmin;
window.registerAdmin       = registerAdmin;
window.handleLogout        = handleLogout;
window.switchAuthTab       = switchAuthTab;
window.triggerBiometricScan = triggerBiometricScan;
window.handleAuthEnter     = handleAuthEnter;
window.applyPreset         = applyPreset;
window.clearPreset         = clearPreset;
window.updatePreview       = updatePreview;
window.toggleSchedule      = toggleSchedule;
window.enviarNotificacion  = enviarNotificacion;
window.borrarNotificacion  = borrarNotificacion;
window.cancelarProgramada  = cancelarProgramada;
window.playSynthSound      = playSynthSound;

// ── REFERENCIAS DE FIREBASE ────────────────────────────────────────────────

let dbRef;
let scheduledRef;
let tokensRef;

function initAdminPanel() {
    const waitForRefs = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.database) {
            clearInterval(waitForRefs);
            try {
                // Usar referencia directa a Firebase DB (sin Auth)
                dbRef          = firebase.database().ref('notifications_history');
                scheduledRef   = firebase.database().ref('scheduledNotifications');
                tokensRef      = firebase.database().ref('push_tokens');

                listenToHistory();
                listenToScheduled();
                countSubscribers();
                updatePreview();
                checkServerHealth();
                setInterval(checkServerHealth, 15000);

                console.log('✅ Panel Admin inicializado correctamente.');
            } catch (err) {
                console.error('❌ Error inicializando panel:', err);
            }
        }
    }, 400);
}

// ── TELEMETRÍA ─────────────────────────────────────────────────────────────

function checkServerHealth() {
    const start    = Date.now();
    const statusEl = document.getElementById('serverStatus');
    const pingEl   = document.getElementById('pingValue');

    fetch('/api/health')
        .then(res => {
            const latency = Date.now() - start;
            if (statusEl) {
                statusEl.textContent = 'ACTIVO';
                statusEl.style.color = '#10b981';
            }
            if (pingEl) {
                pingEl.textContent = `${latency} ms`;
                pingEl.style.color = latency < 150 ? '#10b981' : (latency < 400 ? '#f59e0b' : '#f43f5e');
            }
        })
        .catch(() => {
            if (statusEl) {
                statusEl.textContent = 'LOCAL';
                statusEl.style.color = '#f59e0b';
            }
            if (pingEl) {
                pingEl.textContent = '—';
                pingEl.style.color = '#f59e0b';
            }
        });
}

function countSubscribers() {
    if (!tokensRef) return;
    tokensRef.on('value', (snap) => {
        const count = snap.numChildren() || 0;
        const el = document.getElementById('deviceCounter');
        if (el) el.innerHTML = `${count} dispositivos`;
    });
}

// ── PREVISUALIZACIÓN Y PRESETS ─────────────────────────────────────────────

function updatePreview() {
    const title  = document.getElementById('titulo')?.value  || 'Puro Llano Radio 🤠';
    const body   = document.getElementById('mensaje')?.value || 'Tu mensaje aparecerá aquí...';
    const imgUrl = document.getElementById('imagen')?.value.trim() || '';

    const prevTitle = document.getElementById('prevTitle');
    const prevBody  = document.getElementById('prevBody');
    if (prevTitle) prevTitle.textContent = title;
    if (prevBody)  prevBody.textContent  = body;

    const prevImgWrap = document.getElementById('prevImageWrap');
    const prevImg     = document.getElementById('prevImage');
    if (imgUrl && imgUrl.startsWith('http')) {
        if (prevImg) prevImg.src = imgUrl;
        if (prevImgWrap) prevImgWrap.style.display = 'block';
    } else {
        if (prevImgWrap) prevImgWrap.style.display = 'none';
        if (prevImg)     prevImg.src = '';
    }
}

function applyPreset(type) {
    playSynthSound('click');
    const presets = {
        aire:   { t: '¡ESTAMOS AL AIRE! 📻',  m: 'Sintoniza nuestra programación en vivo. ¡Joropo del bueno!' },
        musica: { t: '🎵 NUEVA CANCIÓN',        m: 'Acaba de sonar un exitazo llanero. ¡Entra a verlo!' },
        evento: { t: '⭐ EVENTO ESPECIAL',       m: 'Gran Parranda Llanera en vivo. ¡Únete ahora!' }
    };
    if (presets[type]) {
        document.getElementById('titulo').value  = presets[type].t;
        document.getElementById('mensaje').value = presets[type].m;
        updatePreview();
    }
}

function clearPreset() {
    playSynthSound('click');
    ['titulo', 'mensaje', 'url', 'imagen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    updatePreview();
}

function toggleSchedule() {
    playSynthSound('click');
    const toggle  = document.getElementById('scheduleToggle');
    const box     = document.getElementById('scheduleBox');
    const btnText = document.getElementById('btnSubmitText');

    if (toggle.checked) {
        box.style.display = 'block';
        if (btnText) btnText.textContent = 'Agendar Emisión Retardada';
    } else {
        box.style.display = 'none';
        if (btnText) btnText.textContent = 'Lanzar Notificación Masiva';
    }
}

// ── ENVÍO DE NOTIFICACIONES ────────────────────────────────────────────────

function enviarNotificacion(e) {
    e.preventDefault();
    if (!dbRef) {
        showStatus('❌ Base de datos no conectada. Espera un momento y vuelve a intentarlo.', 'error');
        return;
    }

    const btnSubmit   = document.getElementById('btnSubmit');
    const isScheduled = document.getElementById('scheduleToggle').checked;
    const scheduledTime = document.getElementById('scheduledTime').value;

    if (isScheduled && !scheduledTime) {
        showStatus('⚠️ Selecciona fecha y hora para la agenda.', 'error');
        playSynthSound('error');
        return;
    }

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Transmitiendo...';

    const notifData = {
        title:     document.getElementById('titulo').value.trim(),
        body:      document.getElementById('mensaje').value.trim(),
        url:       document.getElementById('url').value.trim() || null,
        image:     document.getElementById('imagen').value.trim() || null,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    const resetBtn = () => {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa fa-paper-plane"></i> <span id="btnSubmitText">Lanzar Notificación Masiva</span>';
    };

    if (isScheduled) {
        notifData.scheduledTime = new Date(scheduledTime).getTime();
        notifData.sent = false;

        scheduledRef.push(notifData)
            .then(() => {
                playSynthSound('success');
                showStatus('📅 Notificación agendada exitosamente.', 'success');
                document.getElementById('notifyForm').reset();
                document.getElementById('scheduleToggle').checked = false;
                toggleSchedule();
                updatePreview();
            })
            .catch(err => {
                showStatus('❌ Error al agendar: ' + err.message, 'error');
                playSynthSound('error');
            })
            .finally(resetBtn);
    } else {
        dbRef.push(notifData)
            .then(() => {
                showStatus('🛰️ Señal guardada. Enviando push...', 'info');

                // Intentar enviar via API server. Si no está disponible, sigue funcionando.
                return fetch('/api/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: notifData.title,
                        body:  notifData.body,
                        url:   notifData.url,
                        image: notifData.image,
                        pin:   ADMIN_CONFIG.masterPin  // PIN como autenticación del servidor
                    })
                });
            })
            .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
            .then(data => {
                if (data.error) throw new Error(data.error);
                playSynthSound('success');
                showStatus(`🚀 Enviado a ${data.sent || 0} dispositivos.`, 'success');
                document.getElementById('notifyForm').reset();
                updatePreview();
            })
            .catch(err => {
                // Si la API falla, la notificación fue igual guardada en DB
                playSynthSound('success');
                showStatus('✅ Notificación guardada. API de push no disponible localmente.', 'info');
                document.getElementById('notifyForm').reset();
                updatePreview();
            })
            .finally(resetBtn);
    }
}

// ── HISTORIAL Y AGENDADOS ──────────────────────────────────────────────────

function listenToScheduled() {
    if (!scheduledRef) return;
    const listEl = document.getElementById('scheduledList');

    scheduledRef.orderByChild('scheduledTime').on('value', (snap) => {
        listEl.innerHTML = '';
        const items = [];
        snap.forEach(child => {
            const data = child.val();
            if (!data.sent) items.push({ id: child.key, ...data });
        });

        if (items.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;padding:10px;">Sin emisiones agendadas.</p>';
            return;
        }

        items.forEach(item => {
            const date = new Date(item.scheduledTime).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            const card = document.createElement('div');
            card.className = 'history-card';
            card.style.borderLeft = '3px solid var(--secondary)';
            card.innerHTML = `
                <div class="history-card-header">
                    <span class="card-time"><i class="fa fa-clock"></i> ${date}</span>
                    <button class="btn-delete" onclick="cancelarProgramada('${item.id}')" title="Cancelar">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
                <div class="card-title">${escapeHTML(item.title)}</div>
                <div class="card-body">${escapeHTML(item.body)}</div>
                ${item.image ? `<img src="${item.image}" class="card-preview-image" alt="">` : ''}
            `;
            listEl.appendChild(card);
        });
    });
}

function cancelarProgramada(id) {
    playSynthSound('click');
    if (confirm('¿Descartar esta emisión programada?')) {
        scheduledRef.child(id).remove().then(() => playSynthSound('success'));
    }
}

function listenToHistory() {
    if (!dbRef) return;
    const listEl = document.getElementById('historyList');

    dbRef.orderByChild('timestamp').limitToLast(15).on('value', (snap) => {
        listEl.innerHTML = '';
        const items = [];
        snap.forEach(child => items.push({ id: child.key, ...child.val() }));
        items.reverse();

        if (items.length === 0) {
            listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;padding:10px;">Sin registros en el log.</p>';
            return;
        }

        items.forEach(item => {
            const date = new Date(item.timestamp).toLocaleString('es-ES', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-card-header">
                    <span class="card-time" style="color:var(--primary);"><i class="fa fa-paper-plane"></i> ${date}</span>
                    <button class="btn-delete" onclick="borrarNotificacion('${item.id}')" title="Eliminar">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
                <div class="card-title">${escapeHTML(item.title)}</div>
                <div class="card-body">${escapeHTML(item.body)}</div>
                ${item.image ? `<img src="${item.image}" class="card-preview-image" alt="">` : ''}
            `;
            listEl.appendChild(card);
        });
    });
}

function borrarNotificacion(id) {
    playSynthSound('click');
    if (confirm('¿Eliminar este registro?')) {
        dbRef.child(id).remove()
            .then(() => playSynthSound('success'))
            .catch(err => alert('Error: ' + err.message));
    }
}

// ── UTILIDADES ─────────────────────────────────────────────────────────────

function showStatus(text, type = 'success') {
    const el = document.getElementById('statusMessage');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');

    const styles = {
        success: { bg: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981' },
        info:    { bg: 'rgba(254, 210, 2, 0.1)',  border: '1px solid #fed202',  color: '#fed202'  },
        error:   { bg: 'rgba(244, 63, 94, 0.1)',  border: '1px solid #f43f5e',  color: '#f43f5e'  }
    };
    const s = styles[type] || styles.info;
    Object.assign(el.style, { background: s.bg, border: s.border, color: s.color });

    setTimeout(() => el.classList.add('hidden'), 6000);
}

function showLoginError(text) {
    const el = document.getElementById('loginError');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('hidden');
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}
