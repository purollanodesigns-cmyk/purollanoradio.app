/* ==========================================================================
   PANEL DE ADMINISTRACIÓN DE NOTIFICACIONES - PURO LLANO RADIO
   ==========================================================================
   Sistema de autenticación por PIN doble (usuario + PIN maestro) sin
   dependencia de Firebase Auth. Acceso validado contra Firebase Database.
   ========================================================================== */

// Autenticación real: Firebase Authentication + autorización del Worker.
const ADMIN_CONFIG = {
    sessionKey: 'prl_admin_session',
    sessionDuration: 4 * 60 * 60 * 1000
};

function adminEndpoint(path) {
    const base = String(window.CHAT_MESSAGE_ENDPOINT || '').replace(/\/$/, '');
    if (!/^https:\/\//i.test(base)) throw new Error('Falta configurar window.CHAT_MESSAGE_ENDPOINT con la URL HTTPS real del Worker.');
    return `${base}${path}`;
}

async function getAdminToken() {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Inicia sesión para continuar.');
    return user.getIdToken();
}

let currentAdminRole = null;
async function checkAdminAuthorization(user) {
    const token = await user.getIdToken();
    const response = await fetch(adminEndpoint('/admin-auth'), { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
        await firebase.auth().signOut();
        throw new Error(result.error || 'Esta cuenta no tiene permisos de administrador.');
    }
    currentAdminRole = result.role || 'operator';
    const registerTab = document.getElementById('tabRegister');
    if (registerTab) registerTab.style.display = currentAdminRole === 'admin' ? '' : 'none';
    if (currentAdminRole !== 'admin' && document.getElementById('registerFormArea') && !document.getElementById('registerFormArea').classList.contains('hidden')) switchAuthTab('login');
    return result;
}

async function loginAdmin() {
    const email = document.getElementById('adminEmail').value.trim().toLowerCase();
    const password = document.getElementById('adminPassword').value;
    const btn = document.getElementById('btnAuthSubmit');
    if (!email || !password) return showLoginError('Introduce tu correo y contraseña.');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Autenticando...';
    try {
        const credential = await firebase.auth().signInWithEmailAndPassword(email, password);
        await checkAdminAuthorization(credential.user);
        playSynthSound('success');
        document.getElementById('authOverlay').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('loginError').classList.add('hidden');
        initAdminPanel();
    } catch (error) {
        playSynthSound('error');
        showLoginError(error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
            ? 'Correo o contraseña incorrectos.' : (error.message || 'No se pudo iniciar sesión.'));
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-shield-alt"></i> Validar Acceso';
    }
}

async function registerAdmin() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const btn = document.getElementById('btnAuthRegister');
    if (!name || !email || !password) return showLoginError('Completa nombre, correo y contraseña.');
    if (password.length < 12) return showLoginError('Usa una contraseña de al menos 12 caracteres.');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creando cuenta...';
    try {
        const token = await getAdminToken();
        const response = await fetch(adminEndpoint('/admin-users'), {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo crear la cuenta.');
        playSynthSound('success');
        alert(`Cuenta creada para ${email}. Por seguridad, la contraseña no se muestra ni se guarda en la base de datos.`);
        document.getElementById('regName').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
        switchAuthTab('login');
    } catch (error) {
        showLoginError(error.message || 'Error al crear la cuenta.');
        playSynthSound('error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-user-plus"></i> Crear cuenta de operador';
    }
}

function checkExistingSession() {
    return !!(firebase?.auth?.().currentUser);
}

function handleLogout() {
    playSynthSound('click');
    firebase.auth().signOut().finally(() => location.reload());
}

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

// ── INTERFAZ DE AUTENTICACIÓN ───────────────────────────────────────────────
function switchAuthTab(tab) {
    playSynthSound('click');
    document.getElementById('loginError').classList.add('hidden');
    const isLogin = tab === 'login';
    document.getElementById('tabLogin').classList.toggle('active', isLogin);
    document.getElementById('tabRegister').classList.toggle('active', !isLogin);
    document.getElementById('loginFormArea').classList.toggle('hidden', !isLogin);
    document.getElementById('registerFormArea').classList.toggle('hidden', isLogin);
}
function triggerBiometricScan() { loginAdmin(); }
function handleAuthEnter(event, type) {
    if (event.key === 'Enter') {
        event.preventDefault();
        if (type === 'register') registerAdmin(); else loginAdmin();
    }
}

// ── INICIALIZACIÓN AL CARGAR LA PÁGINA ─────────────────────────────────────

let firebaseReady = false;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        showLoginError('Firebase Authentication no está disponible.');
        return;
    }
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            document.getElementById('authOverlay').classList.remove('hidden');
            document.getElementById('mainApp').classList.add('hidden');
            return;
        }
        try {
            await checkAdminAuthorization(user);
            document.getElementById('authOverlay').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            initAdminPanel();
        } catch (error) {
            showLoginError(error.message || 'Cuenta sin autorización de administrador.');
            document.getElementById('authOverlay').classList.remove('hidden');
            document.getElementById('mainApp').classList.add('hidden');
        }
    });
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

let adminSnapshot = { history: [], scheduled: [], subscribers: 0 };
let adminRefreshTimer = null;

function initAdminPanel() {
    refreshAdminData().catch(err => showStatus(err.message || 'No se pudieron cargar los datos del panel.', 'error'));
    if (adminRefreshTimer) clearInterval(adminRefreshTimer);
    adminRefreshTimer = setInterval(() => refreshAdminData().catch(() => {}), 15000);
    updatePreview();
    checkServerHealth();
    setInterval(checkServerHealth, 15000);
}

async function adminApi(action, payload = null) {
    const token = await getAdminToken();
    const response = await fetch(adminEndpoint('/admin-notifications'), {
        method: payload ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${token}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
        ...(payload ? { body: JSON.stringify({ action, ...payload }) } : {})
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || `Error del servidor (${response.status})`);
    return result;
}

async function refreshAdminData() {
    const data = await adminApi('read');
    adminSnapshot = data;
    renderScheduled(data.scheduled || []);
    renderHistory(data.history || []);
    const el = document.getElementById('deviceCounter');
    if (el) el.textContent = `${data.subscribers || 0} dispositivos`;
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

async function enviarNotificacion(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    const isScheduled = document.getElementById('scheduleToggle').checked;
    const scheduledTime = document.getElementById('scheduledTime').value;
    if (isScheduled && !scheduledTime) return showStatus('Selecciona fecha y hora para la agenda.', 'error');
    const notification = {
      title: document.getElementById('titulo').value.trim(), body: document.getElementById('mensaje').value.trim(),
      url: document.getElementById('url').value.trim() || '/', image: document.getElementById('imagen').value.trim() || ''
    };
    if (!notification.title || !notification.body) return showStatus('El título y el mensaje son obligatorios.', 'error');
    btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Procesando...';
    try {
      if (isScheduled) {
        await adminApi('schedule', { notification, scheduledTime: new Date(scheduledTime).getTime() });
        showStatus('Notificación agendada correctamente.', 'success');
      } else {
        showStatus('Enviando notificación...', 'info');
        const result = await adminApi('send', { notification });
        showStatus(`Notificación enviada a ${result.sent} dispositivos.`, 'success');
      }
      playSynthSound('success'); document.getElementById('notifyForm').reset();
      document.getElementById('scheduleToggle').checked = false; toggleSchedule(); updatePreview();
      await refreshAdminData();
    } catch (err) { playSynthSound('error'); showStatus(err.message || 'No se pudo procesar la notificación.', 'error'); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fa fa-paper-plane"></i> <span id="btnSubmitText">Lanzar Notificación Masiva</span>'; }
}

function renderScheduled(items) {
    const listEl = document.getElementById('scheduledList'); if (!listEl) return;
    listEl.replaceChildren();
    if (!items.length) { listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;padding:10px;">Sin emisiones agendadas.</p>'; return; }
    items.forEach(item => {
      const date = new Date(item.scheduledTime).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      const card=document.createElement('div'); card.className='history-card'; card.style.borderLeft='3px solid var(--secondary)';
      const header=document.createElement('div'); header.className='history-card-header';
      const time=document.createElement('span'); time.className='card-time'; time.textContent=`◷ ${date}`;
      const del=document.createElement('button'); del.className='btn-delete'; del.title='Cancelar'; del.textContent='×'; del.addEventListener('click',()=>cancelarProgramada(item.id));
      header.append(time,del); const title=document.createElement('div'); title.className='card-title'; title.textContent=item.title||'';
      const body=document.createElement('div'); body.className='card-body'; body.textContent=item.body||''; card.append(header,title,body);
      if(item.image){try{const u=new URL(item.image);if(u.protocol==='https:'){const img=document.createElement('img');img.src=u.href;img.className='card-preview-image';img.alt='';img.referrerPolicy='no-referrer';card.append(img)}}catch{}}
      listEl.append(card);
    });
}
async function cancelarProgramada(id) {
    if (!confirm('¿Descartar esta emisión programada?')) return;
    try { await adminApi('cancel',{id}); playSynthSound('success'); await refreshAdminData(); }
    catch(err){ alert(err.message || 'No se pudo cancelar.'); }
}
function renderHistory(items) {
    const listEl=document.getElementById('historyList'); if(!listEl)return; listEl.replaceChildren();
    if(!items.length){listEl.innerHTML='<p style="color:var(--text-muted);font-size:0.8rem;padding:10px;">Sin registros en el log.</p>';return;}
    items.forEach(item=>{
      const stamp=item.sentAt||item.timestamp||0; const date=new Date(stamp).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      const card=document.createElement('div');card.className='history-card';const header=document.createElement('div');header.className='history-card-header';
      const time=document.createElement('span');time.className='card-time';time.textContent=`➤ ${date}`;
      const del=document.createElement('button');del.className='btn-delete';del.title='Eliminar historial';del.textContent='×';del.addEventListener('click',()=>borrarNotificacion(item.id));
      header.append(time,del);const title=document.createElement('div');title.className='card-title';title.textContent=item.title||'';const body=document.createElement('div');body.className='card-body';body.textContent=item.body||'';card.append(header,title,body);
      if(item.image){try{const u=new URL(item.image);if(u.protocol==='https:'){const img=document.createElement('img');img.src=u.href;img.className='card-preview-image';img.alt='';img.referrerPolicy='no-referrer';card.append(img)}}catch{}}
      listEl.append(card);
    });
}
async function borrarNotificacion(id) {
    if (!confirm('¿Eliminar este registro del historial?')) return;
    try { await adminApi('delete',{id}); playSynthSound('success'); await refreshAdminData(); }
    catch(err){ alert(err.message || 'No se pudo eliminar el registro.'); }
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
