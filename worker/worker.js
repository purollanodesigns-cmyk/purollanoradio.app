/**
 * PurollanoRadio - Worker de notificaciones programadas.
 * Preparado para revisión local; no desplegar hasta completar las pruebas.
 * Requiere los secretos: CRON_SECRET, FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.
 */

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_CHAT_ALLOWED_ORIGINS = [
  'https://purollanoradioapp.vercel.app',
  'https://897df438.purollanoradio-com.pages.dev',
  'https://purollanoradio.com',
  'https://www.purollanoradio.com'
];

// En staging se configura CHAT_ALLOWED_ORIGINS con el origen exacto de pruebas.
// No admite comodines; si no se configura, conserva los orígenes de producción configurados.
function getAllowedOrigins(env) {
  const configured = typeof env.CHAT_ALLOWED_ORIGINS === 'string'
    ? env.CHAT_ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean)
    : [];
  return new Set(configured.length ? configured : DEFAULT_CHAT_ALLOWED_ORIGINS);
}
// Host confirmado por el operador en Firebase Console.
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/firebase.messaging'
].join(' ');

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(Promise.allSettled([
      processNotifications(env),
      syncRadioHistory(env)
    ]));
  },

  // Rutas independientes: el chat público NO recibe ni necesita CRON_SECRET.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/chat-message') {
      return handlePublicChatMessage(request, env);
    }
    if (url.pathname === '/chat-presence') {
      return handlePublicChatState(request, env, 'presence');
    }
    if (url.pathname === '/chat-typing') {
      return handlePublicChatState(request, env, 'typing');
    }
    if (url.pathname === '/visits') {
      return handlePublicVisit(request, env);
    }
    if (url.pathname === '/register-push-token') {
      return handleRegisterPushToken(request, env);
    }
    if (url.pathname === '/sync-history') {
      return handleSyncHistory(request, env);
    }
    if (url.pathname === '/admin-auth') {
      return handleAdminAuth(request, env, 'check');
    }
    if (url.pathname === '/admin-users') {
      return handleAdminAuth(request, env, 'create');
    }
    if (url.pathname === '/admin-notifications') {
      return handleAdminNotifications(request, env);
    }

    // Endpoint manual de cron: solo POST + Authorization: Bearer <CRON_SECRET>.
    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido' }, 405, { Allow: 'POST' });
    }
    const configuredSecret = env.CRON_SECRET;
    const authorization = request.headers.get('Authorization') || '';
    if (!configuredSecret || authorization !== `Bearer ${configuredSecret}`) {
      return json({ error: 'No autorizado' }, 401);
    }
    try {
      const summary = await processNotifications(env);
      return json({ ok: true, ...summary }, 200);
    } catch (_error) {
      console.error('[Cron] Falló el procesamiento. Revisar configuración y permisos.');
      return json({ error: 'Error interno al procesar notificaciones' }, 500);
    }
  }
};





// Panel de notificaciones: Firebase Auth + autorización comprobada en servidor.
async function handleAdminAuth(request, env, action) {
  const origin = request.headers.get('Origin') || '';
  const allowed = getAllowedOrigins(env);
  const cors = origin && allowed.has(origin) ? {
    'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type'
  } : {};
  if (request.method === 'OPTIONS') {
    if (!allowed.has(origin)) return json({ error: 'Origen no permitido' }, 403);
    return new Response(null, { status: 204, headers: cors });
  }
  if (!allowed.has(origin)) return json({ error: 'Origen no permitido' }, 403);
  if ((action === 'check' && request.method !== 'GET') || (action === 'create' && request.method !== 'POST')) {
    return json({ error: 'Método no permitido' }, 405, { Allow: action === 'check' ? 'GET, OPTIONS' : 'POST, OPTIONS', ...cors });
  }
  if (!env.FIREBASE_WEB_API_KEY) return json({ error: 'Falta configurar FIREBASE_WEB_API_KEY' }, 503, cors);
  const bearer = request.headers.get('Authorization') || '';
  const match = bearer.match(/^Bearer\s+(.+)$/i);
  if (!match) return json({ error: 'Sesión requerida' }, 401, cors);
  try {
    const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: match[1] })
    });
    if (!lookup.ok) return json({ error: 'Sesión Firebase inválida o expirada' }, 401, cors);
    const lookupData = await lookup.json();
    const caller = lookupData.users?.[0];
    if (!caller?.localId || caller.disabled) return json({ error: 'Cuenta no autorizada' }, 403, cors);
    validateEnv(env);
    const accessToken = await getGoogleAccessToken(env);
    const dbUrl = getFirebaseDatabaseUrl(env);
    const role = await firebaseRequest(`${dbUrl}/admin_users/${encodeURIComponent(caller.localId)}.json`, accessToken);
    if (!role || !['admin', 'operator'].includes(role.role) || role.active === false) return json({ error: 'Cuenta sin autorización para el panel' }, 403, cors);
    if (action === 'check') return json({ ok: true, uid: caller.localId, email: caller.email, role: role.role }, 200, cors);
    if (role.role !== 'admin') return json({ error: 'Solo un administrador puede crear cuentas' }, 403, cors);

    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'Solicitud demasiado grande' }, 413, cors);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: 'JSON inválido' }, 400, cors); }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) {
      return json({ error: 'Nombre, correo o contraseña no cumplen los requisitos. Usa una contraseña de al menos 12 caracteres.' }, 400, cors);
    }
    const create = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const created = await create.json();
    if (!create.ok || !created.localId) {
      const code = created.error?.message || '';
      const msg = code.includes('EMAIL_EXISTS') ? 'Ese correo ya tiene una cuenta.' : 'No se pudo crear la cuenta de Firebase Authentication.';
      return json({ error: msg }, 409, cors);
    }
    const record = { name, email, username: email.split('@')[0], role: 'operator', active: true, createdAt: Date.now(), createdBy: caller.localId };
    try {
      await firebaseRequest(`${dbUrl}/admin_users/${encodeURIComponent(created.localId)}.json`, accessToken, { method: 'PUT', body: JSON.stringify(record) });
    } catch (_writeError) {
      // Compensación: evitar dejar una cuenta de Auth sin registro de permisos.
      // Si la eliminación también falla, devolver un aviso accionable sin exponer tokens.
      let rolledBack = false;
      if (created.idToken) {
        try {
          const deletion = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: created.idToken })
          });
          rolledBack = deletion.ok;
        } catch (_deleteError) { /* se reporta abajo */ }
      }
      console.error(`[AdminAuth] No se pudo guardar el rol del operador; rollback=${rolledBack}`);
      return json({ error: rolledBack
        ? 'No se pudo guardar el permiso del operador; la cuenta de autenticación fue revertida. Inténtalo de nuevo.'
        : 'No se pudo guardar el permiso del operador y no se pudo confirmar la reversión. Revisa Firebase Authentication antes de volver a crear esa cuenta.' }, 502, cors);
    }
    return json({ ok: true, uid: created.localId, email, message: 'Cuenta creada. La contraseña no se devuelve ni se almacena en Realtime Database.' }, 201, cors);
  } catch (error) {
    console.error('[AdminAuth] Error controlado en autenticación/alta de operador');
    return json({ error: 'Error interno al validar o crear la cuenta' }, 500, cors);
  }
}

// API administrativa: todas las operaciones de notificaciones pasan por servidor.
async function handleAdminNotifications(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = getAllowedOrigins(env);
  const cors = origin && allowed.has(origin) ? {
    'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Cache-Control': 'no-store'
  } : { 'Cache-Control': 'no-store' };
  if (request.method === 'OPTIONS') return allowed.has(origin) ? new Response(null, {status:204,headers:cors}) : json({error:'Origen no permitido'},403);
  if (!allowed.has(origin)) return json({error:'Origen no permitido'},403,cors);
  if (!['GET','POST'].includes(request.method)) return json({error:'Método no permitido'},405,{...cors,Allow:'GET, POST, OPTIONS'});
  if (!env.FIREBASE_WEB_API_KEY) return json({error:'Falta configurar FIREBASE_WEB_API_KEY'},503,cors);
  const match=(request.headers.get('Authorization')||'').match(/^Bearer\s+(.+)$/i);
  if(!match) return json({error:'Sesión requerida'},401,cors);
  try {
    const lookup=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:match[1]})});
    if(!lookup.ok) return json({error:'Sesión Firebase inválida o expirada'},401,cors);
    const user=(await lookup.json()).users?.[0];
    if(!user?.localId||user.disabled) return json({error:'Cuenta no autorizada'},403,cors);
    validateEnv(env); const accessToken=await getGoogleAccessToken(env); const db=getFirebaseDatabaseUrl(env);
    const account=await firebaseRequest(`${db}/admin_users/${encodeURIComponent(user.localId)}.json`,accessToken);
    if(!account||!['admin','operator'].includes(account.role)||account.active===false) return json({error:'Cuenta sin permisos del panel'},403,cors);
    if(request.method==='GET') {
      const [history,scheduled,tokens]=await Promise.all([
        firebaseRequest(`${db}/notifications_history.json?orderBy=%22timestamp%22&limitToLast=30`,accessToken),
        firebaseRequest(`${db}/scheduledNotifications.json?orderBy=%22scheduledTime%22`,accessToken),
        firebaseRequest(`${db}/push_tokens.json`,accessToken)
      ]);
      const normalize=(value)=>value&&typeof value==='object'?Object.entries(value).map(([id,item])=>({id,...(item||{})})):[];
      const tokenValues=tokens&&typeof tokens==='object'?Object.values(tokens).map(v=>typeof v==='string'?v:v?.token).filter(v=>typeof v==='string'&&v.length>0):[];
      return json({ok:true,role:account.role,history:normalize(history).sort((a,b)=>(b.timestamp||b.sentAt||0)-(a.timestamp||a.sentAt||0)).slice(0,30),scheduled:normalize(scheduled).filter(x=>x.sent!==true).sort((a,b)=>(a.scheduledTime||0)-(b.scheduledTime||0)),subscribers:new Set(tokenValues).size},200,cors);
    }
    const raw=await request.text(); if(raw.length>8192) return json({error:'Solicitud demasiado grande'},413,cors);
    let body; try{body=JSON.parse(raw)}catch{return json({error:'JSON inválido'},400,cors)}
    const action=body.action;
    if(action==='schedule') {
      let n; try { n=validateNotification(body.notification); } catch(e) { return json({error:e.message},400,cors); }
      const when=Number(body.scheduledTime);
      if(!Number.isFinite(when)||when<Date.now()+60000||when>Date.now()+366*24*60*60*1000) return json({error:'La fecha debe estar al menos a un minuto en el futuro y dentro del próximo año.'},400,cors);
      n.timestamp=Date.now(); n.scheduledTime=when; n.sent=false;
      const result=await firebaseRequest(`${db}/scheduledNotifications.json`,accessToken,{method:'POST',body:JSON.stringify(n)});
      return json({ok:true,id:result?.name},201,cors);
    }
    if(action==='send') {
      let n; try { n=validateNotification(body.notification); } catch(e) { return json({error:e.message},400,cors); }
      const tokensData=await firebaseRequest(`${db}/push_tokens.json`,accessToken);
      const tokenEntries = tokensData && typeof tokensData === 'object' ? Object.entries(tokensData) : [];
      const tokens=[...new Set(tokenEntries.map(([_, v]) => typeof v === 'string' ? v : v?.token).filter(v => typeof v === 'string' && v.length > 0))];
      if(!tokens.length) return json({error:'No hay dispositivos suscritos en este momento. Ingresa a la web y activa las notificaciones para registrar tu dispositivo.'},409,cors);
      let success=0,failed=0;
      for(const token of tokens){
        try{
          await sendPushNotification(env,accessToken,token,{title:n.title,body:n.body,image:n.image||undefined,url:n.url||'/'});
          success++;
        }catch(fcmErr){
          failed++;
          // Limpiar token inválido o no registrado de Firebase para depurar la lista
          const tokenKey = await hashPushToken(token);
          await firebaseRequest(`${db}/push_tokens/${tokenKey}.json`, accessToken, { method: 'DELETE' }).catch(() => {});
        }
      }
      if(success === 0 && failed > 0) {
        return json({
          error: `Los dispositivos registrados (${failed}) tenían tokens vencidos o de prueba y fueron depurados. Por favor, abre la web en tu navegador y pulsa "Activar Notificaciones" para registrar tu dispositivo actual.`,
          sent: 0,
          failed
        }, 502, cors);
      }
      const record={...n,timestamp:Date.now(),sentAt:Date.now(),sentDetails:{success, failure:failed},sentBy:user.localId};
      await firebaseRequest(`${db}/notifications_history.json`,accessToken,{method:'POST',body:JSON.stringify(record)});
      return json({ok:true,sent:success,failed},200,cors);
    }
    if(action==='cancel'||action==='delete') {
      const id=typeof body.id==='string'?body.id:'';
      if(!/^[A-Za-z0-9_-]{5,128}$/.test(id)) return json({error:'Identificador inválido'},400,cors);
      if(action==='delete' && account.role!=='admin') return json({error:'Solo un administrador puede borrar historial'},403,cors);
      const path=action==='cancel'?'scheduledNotifications':'notifications_history';
      await firebaseRequest(`${db}/${path}/${encodeURIComponent(id)}.json`,accessToken,{method:'DELETE'});
      return json({ok:true},200,cors);
    }
    return json({error:'Acción no admitida'},400,cors);
  } catch(error) { console.error('[AdminNotifications] Error de operación administrativa'); return json({error:'No se pudo completar la operación. Revisa configuración, permisos y conexión FCM.'},500,cors); }
}
function validateNotification(value) {
  const n=value&&typeof value==='object'?value:{};
  const title=typeof n.title==='string'?n.title.trim():''; const body=typeof n.body==='string'?n.body.trim():'';
  const url=typeof n.url==='string'?n.url.trim():'/'; const image=typeof n.image==='string'?n.image.trim():'';
  if(title.length<1||title.length>120||body.length>2000||!body) throw new Error('Título o mensaje inválido');
  for(const [label,value] of [['URL',url],['imagen',image]]) if(value && (!/^https:\/\//i.test(value) || value.length>2048)) throw new Error(`${label} debe ser una URL HTTPS`);
  return {title,body,url:url||'/',image:image||null};
}

// Registra un token FCM enviado por el cliente.
// El cliente ya no escribe en Firebase directamente; todo pasa por el Worker.
// Requiere que el token tenga formato válido (≥100 caracteres, solo base64url + ':').
// No exige autenticación de usuario porque los tokens FCM son inherentemente anónimos.
async function handleRegisterPushToken(request, env) {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = origin && getAllowedOrigins(env).has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    : {};

  if (request.method === 'OPTIONS') {
    if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405, { Allow: 'POST, OPTIONS', ...corsHeaders });
  if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Se requiere application/json' }, 415, corsHeaders);
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'Solicitud demasiado grande' }, 413, corsHeaders);
    input = JSON.parse(raw);
  } catch (_error) {
    return json({ error: 'JSON inválido' }, 400, corsHeaders);
  }

  const token = typeof input.token === 'string' ? input.token.trim() : '';
  // Los tokens FCM tienen entre ~100 y ~200 caracteres y usan base64url + ':' + '-'
  if (token.length < 100 || token.length > 512 || !/^[A-Za-z0-9_:%-]+$/.test(token)) {
    return json({ error: 'Token FCM inválido' }, 400, corsHeaders);
  }

  try {
    validateEnv(env);
    const accessToken = await getGoogleAccessToken(env);
    const dbUrl = getFirebaseDatabaseUrl(env);

    // Usar SHA-256 del token como clave en RTDB; nunca se almacena el token crudo como clave.
    const tokenKey = await hashPushToken(token);
    const tokenData = {
      token,
      registeredAt: Date.now(),
      userAgent: (request.headers.get('User-Agent') || '').slice(0, 150)
    };

    await firebaseRequest(
      `${dbUrl}/push_tokens/${tokenKey}.json`,
      accessToken,
      { method: 'PUT', body: JSON.stringify(tokenData) }
    );

    return json({ ok: true }, 200, corsHeaders);
  } catch (_error) {
    console.error('[PushToken] No se pudo guardar el token FCM.');
    return json({ error: 'No se pudo registrar el token' }, 500, corsHeaders);
  }
}

// Control en memoria para evitar saturar el streaming de la radio (debounce 15 segundos)
let lastHistorySyncTime = 0;
let lastHistoryResult = null;

async function handleSyncHistory(request, env) {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = origin && getAllowedOrigins(env).has(origin)
    ? {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
    : {};

  if (request.method === 'OPTIONS') {
    if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405, { Allow: 'GET, POST, OPTIONS', ...corsHeaders });
  }

  if (!getAllowedOrigins(env).has(origin)) {
    return json({ error: 'Origen no permitido' }, 403);
  }

  const now = Date.now();
  if (now - lastHistorySyncTime < 15000 && lastHistoryResult) {
    return json(lastHistoryResult, 200, corsHeaders);
  }

  try {
    const result = await syncRadioHistory(env);
    lastHistorySyncTime = now;
    lastHistoryResult = result;
    return json(result, 200, corsHeaders);
  } catch (error) {
    console.error('[History] Error en handleSyncHistory:', error.message || error);
    return json({ error: 'No se pudo sincronizar el historial', details: error.message || String(error) }, 500, corsHeaders);
  }
}

async function syncRadioHistory(env) {
  const statsUrl = 'https://radio.mipanel.stream:6816/stats?json=1';
  const response = await fetch(statsUrl, {
    headers: { 'User-Agent': 'PuroLlanoRadio-CloudflareWorker/1.0' },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`Streaming stats respondió con error ${response.status}`);
  }

  const stats = await response.json();
  const songTitle = (stats && (stats.songtitle || stats.title)) || '';

  if (!songTitle.trim()) {
    return { ok: true, updated: false, message: 'Sin canción activa reportada en el streaming' };
  }

  let [artist, title] = songTitle.split(' - ').map(s => s ? s.trim() : '');
  if (!title) {
    title = artist;
    artist = 'Artista desconocido';
  }

  validateEnv(env);
  const accessToken = await getGoogleAccessToken(env);
  const dbUrl = getFirebaseDatabaseUrl(env);
  const historyPath = `${dbUrl}/radio_history/puro_llano_radio.json`;

  let currentData = null;
  try {
    currentData = await firebaseRequest(historyPath, accessToken);
  } catch (_e) {
    currentData = null;
  }

  const existingSongs = Array.isArray(currentData?.songs) ? currentData.songs : [];
  const lastCurrent = currentData?.currentSong;

  // Si la canción que suena es la misma que ya está en la cima, no reescribir en Firebase
  if (lastCurrent && lastCurrent.title === title && lastCurrent.artist === artist) {
    return { ok: true, updated: false, currentSong: lastCurrent, songs: existingSongs };
  }

  const now = Date.now();
  const newSong = {
    id: `song-${now}`,
    title,
    artist,
    startTime: now,
    youtubeLink: `https://www.youtube.com/results?search_query=${encodeURIComponent(artist + ' ' + title + ' oficial')}`,
    source: 'streaming-worker',
    isCurrent: true
  };

  // Reordenar historial: remover si ya existía para colocarla de primera y desmarcar isCurrent previo
  const updatedSongs = existingSongs
    .filter(s => !(s.title === title && s.artist === artist))
    .map(s => ({ ...s, isCurrent: false }));

  updatedSongs.unshift(newSong);

  // Mantener las últimas 10 canciones
  const finalSongs = updatedSongs.slice(0, 10);

  const payload = {
    songs: finalSongs,
    currentSong: newSong,
    lastUpdate: now,
    station: 'puro_llano_radio'
  };

  await firebaseRequest(historyPath, accessToken, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

  console.log(`[History] Historial actualizado: ${artist} - ${title}`);
  return { ok: true, updated: true, currentSong: newSong, songs: finalSongs };
}

// Registra como máximo una visita diaria por combinación de IP y User-Agent.
// El identificador se guarda como HMAC; no se persiste la IP en claro.
// Requiere VISIT_HASH_SECRET y rate limiting en Cloudflare antes de producción.
async function handlePublicVisit(request, env) {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = origin && getAllowedOrigins(env).has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    : {};
  if (request.method === 'OPTIONS') {
    if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405, { Allow: 'POST, OPTIONS', ...corsHeaders });
  if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Se requiere application/json' }, 415, corsHeaders);
  }
  try {
    const raw = await request.text();
    if (raw.length > 512) return json({ error: 'Solicitud demasiado grande' }, 413, corsHeaders);
    if (raw.trim() && raw.trim() !== '{}') return json({ error: 'La solicitud no admite campos' }, 400, corsHeaders);
  } catch (_error) {
    return json({ error: 'Solicitud inválida' }, 400, corsHeaders);
  }
  if (typeof env.VISIT_HASH_SECRET !== 'string' || env.VISIT_HASH_SECRET.length < 32) {
    console.error('[Visits] Falta configurar VISIT_HASH_SECRET (mínimo 32 caracteres).');
    return json({ error: 'Contador temporalmente no disponible' }, 503, corsHeaders);
  }
  try {
    validateEnv(env);
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const userAgent = (request.headers.get('User-Agent') || '').slice(0, 256);
    if (!ip) return json({ error: 'No se pudo validar la solicitud' }, 400, corsHeaders);
    const dateKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const fingerprint = await hmacHex(env.VISIT_HASH_SECRET, `${ip}\n${userAgent}`);
    const seenPath = `/visit_dedupe/${dateKey}/${fingerprint}`;
    const accessToken = await getGoogleAccessToken(env);
    const firstVisit = await firebaseCreateIfAbsent(`${getFirebaseDatabaseUrl(env)}${seenPath}.json`, accessToken, { at: Date.now() });
    if (!firstVisit) return json({ ok: true, counted: false, dateKey }, 200, corsHeaders);

    try {
      // Un único PUT condicional en el nodo padre mantiene total y daily coherentes.
      await firebaseIncrementVisitCounters(`${getFirebaseDatabaseUrl(env)}/visits/puro_llano_radio.json`, accessToken, dateKey);
    } catch (error) {
      try { await firebaseRequest(`${getFirebaseDatabaseUrl(env)}${seenPath}.json`, accessToken, { method: 'DELETE' }); } catch (_deleteError) {}
      throw error;
    }
    return json({ ok: true, counted: true, dateKey }, 200, corsHeaders);
  } catch (_error) {
    console.error('[Visits] No se pudo registrar la visita.');
    return json({ error: 'No se pudo registrar la visita' }, 500, corsHeaders);
  }
}

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return [...signature].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function firebaseCreateIfAbsent(url, accessToken, value) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, 'X-Firebase-ETag': 'true' } });
    if (!response.ok) throw new Error(`Firebase read failed (${response.status})`);
    const current = await response.json();
    if (current !== null) return false;
    const etag = response.headers.get('ETag');
    if (!etag) throw new Error('Firebase ETag missing');
    const write = await fetch(url, { method: 'PUT', headers: {
      Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'If-Match': etag
    }, body: JSON.stringify(value) });
    if (write.ok) return true;
    if (write.status !== 412) throw new Error(`Firebase conditional write failed (${write.status})`);
  }
  throw new Error('Firebase create-if-absent retry limit reached');
}

async function firebaseIncrementVisitCounters(url, accessToken, dateKey) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, 'X-Firebase-ETag': 'true' } });
    if (!response.ok) throw new Error(`Firebase visit read failed (${response.status})`);
    const currentValue = await response.json();
    const current = currentValue && typeof currentValue === 'object' ? currentValue : {};
    const total = current.total === undefined || current.total === null ? 0 : current.total;
    const daily = current.daily && typeof current.daily === 'object' ? { ...current.daily } : {};
    const today = daily[dateKey] === undefined || daily[dateKey] === null ? 0 : daily[dateKey];
    if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(today) || today < 0) {
      throw new Error('Invalid Firebase visit counter value');
    }
    if (total >= Number.MAX_SAFE_INTEGER || today >= Number.MAX_SAFE_INTEGER) throw new Error('Firebase visit counter limit reached');
    const etag = response.headers.get('ETag');
    if (!etag) throw new Error('Firebase visit ETag missing');
    const next = { ...current, total: total + 1, daily: { ...daily, [dateKey]: today + 1 } };
    const write = await fetch(url, { method: 'PUT', headers: {
      Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'If-Match': etag
    }, body: JSON.stringify(next) });
    if (write.ok) return;
    if (write.status !== 412) throw new Error(`Firebase visit conditional write failed (${write.status})`);
  }
  throw new Error('Firebase visit transaction retry limit reached');
}

// Endpoint limitado a insertar mensajes normales. Nunca actúa como proxy genérico.
// Antes de producción, añadir rate limiting en Cloudflare para POST /chat-message.
async function handlePublicChatMessage(request, env) {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = origin && getAllowedOrigins(env).has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    : {};

  if (request.method === 'OPTIONS') {
    if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405, { Allow: 'POST, OPTIONS', ...corsHeaders });
  if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Se requiere application/json' }, 415, corsHeaders);
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'Solicitud demasiado grande' }, 413, corsHeaders);
    input = JSON.parse(raw);
  } catch (_error) {
    return json({ error: 'JSON inválido' }, 400, corsHeaders);
  }

  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const userId = typeof input.userId === 'string' ? input.userId.trim() : '';
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (username.length < 2 || username.length > 20 || /[<>\u0000-\u001f]/.test(username)) {
    return json({ error: 'Nombre inválido (2–20 caracteres)' }, 400, corsHeaders);
  }
  if (!/^user_[a-z0-9]+_\d{10,}$/.test(userId) || userId.length > 64) {
    return json({ error: 'Identificador de usuario inválido' }, 400, corsHeaders);
  }
  if (!text || text.length > 500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    return json({ error: 'Mensaje inválido (1–500 caracteres)' }, 400, corsHeaders);
  }

  try {
    validateEnv(env);
    const accessToken = await getGoogleAccessToken(env);
    const now = Date.now();
    const message = {
      id: `msg_${now}`,
      userId,
      username,
      text,
      timestamp: now,
      avatar: chatAvatarColor(userId),
      type: 'normal'
    };
    const result = await firebaseRequest(`${getFirebaseDatabaseUrl(env)}/chat/messages.json`, accessToken, {
      method: 'POST', body: JSON.stringify(message)
    });
    return json({ ok: true, key: result && result.name, message }, 201, corsHeaders);
  } catch (_error) {
    console.error('[Chat] No se pudo guardar un mensaje.');
    return json({ error: 'No se pudo enviar el mensaje' }, 500, corsHeaders);
  }
}

// Estado público del chat: solo permite actualizar/borrar el registro del ID
// recibido y nunca expone un proxy arbitrario de Firebase.
async function handlePublicChatState(request, env, kind) {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = origin && getAllowedOrigins(env).has(origin)
    ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
    : {};
  if (request.method === 'OPTIONS') {
    if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
    return new Response(null, { status: 204, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  }
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405, { Allow: 'POST, OPTIONS', ...corsHeaders });
  if (!getAllowedOrigins(env).has(origin)) return json({ error: 'Origen no permitido' }, 403);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Se requiere application/json' }, 415, corsHeaders);
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: 'Solicitud demasiado grande' }, 413, corsHeaders);
    input = JSON.parse(raw);
  } catch (_error) {
    return json({ error: 'JSON inválido' }, 400, corsHeaders);
  }
  const userId = typeof input.userId === 'string' ? input.userId.trim() : '';
  const username = typeof input.username === 'string' ? input.username.trim() : '';
  const action = typeof input.action === 'string' ? input.action : '';
  if (!/^user_[a-z0-9]+_\d{10,}$/.test(userId) || userId.length > 64) {
    return json({ error: 'Identificador de usuario inválido' }, 400, corsHeaders);
  }
  if (username.length < 2 || username.length > 20 || /[<>\u0000-\u001f]/.test(username)) {
    return json({ error: 'Nombre inválido (2–20 caracteres)' }, 400, corsHeaders);
  }
  const allowedActions = kind === 'presence' ? ['online', 'offline'] : ['typing', 'stop'];
  if (!allowedActions.includes(action)) return json({ error: 'Acción no válida' }, 400, corsHeaders);

  try {
    validateEnv(env);
    const accessToken = await getGoogleAccessToken(env);
    const now = Date.now();
    const base = `${getFirebaseDatabaseUrl(env)}/chat/${kind}/${encodeURIComponent(userId)}.json`;
    if (action === 'offline' || action === 'stop') {
      await firebaseRequest(base, accessToken, { method: 'DELETE' });
    } else {
      const record = kind === 'presence'
        ? { userId, username, online: true, lastSeen: now, avatar: chatAvatarColor(userId) }
        : { userId, username, timestamp: now };
      await firebaseRequest(base, accessToken, { method: 'PUT', body: JSON.stringify(record) });
    }
    return json({ ok: true }, 200, corsHeaders);
  } catch (_error) {
    console.error(`[Chat] No se pudo actualizar ${kind}.`);
    return json({ error: 'No se pudo actualizar el estado del chat' }, 500, corsHeaders);
  }
}

function chatAvatarColor(userId) {
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

async function processNotifications(env) {
  validateEnv(env);
  console.log('[Cron] Iniciando revisión de notificaciones programadas.');

  const accessToken = await getGoogleAccessToken(env);
  const dbUrl = getFirebaseDatabaseUrl(env);
  const now = Date.now();

  const scheduledUrl = `${dbUrl}/scheduledNotifications.json?orderBy=%22scheduledTime%22&endAt=${now}`;
  const pending = await firebaseRequest(scheduledUrl, accessToken);
  if (!pending || typeof pending !== 'object' || Object.keys(pending).length === 0) {
    console.log('[Cron] No hay notificaciones pendientes.');
    return { processed: 0, status: 'no_pending_notifications' };
  }

  const tokensData = await firebaseRequest(`${dbUrl}/push_tokens.json`, accessToken);
  const tokens = tokensData && typeof tokensData === 'object'
    ? [...new Set(Object.values(tokensData).map(value => typeof value === 'string' ? value : value && typeof value.token === 'string' ? value.token : null).filter(value => typeof value === 'string' && value.length > 0))]
    : [];

  if (tokens.length === 0) {
    console.log('[Cron] No hay tokens registrados; se conservan las notificaciones pendientes.');
    return { processed: 0, status: 'no_push_tokens' };
  }

  let processed = 0;
  let failed = 0;

  for (const [key, item] of Object.entries(pending)) {
    if (!item || item.sent === true) continue;
    if (!item.title || typeof item.title !== 'string') {
      console.warn('[Cron] Notificación omitida por datos incompletos; no se elimina.');
      failed++;
      continue;
    }

    // Evitar que dos ejecuciones del cron procesen la misma notificación a la vez.
    const lock = await acquireNotificationLock(dbUrl, accessToken, key);
    if (!lock) {
      console.log('[Cron] Notificación ya reclamada por otra ejecución; se omite este ciclo.');
      continue;
    }

    let successCount = 0;
    let failureCount = 0;
    try {
    // Guardar el progreso por token permite que el siguiente ciclo reintente solo
    // destinatarios fallidos, en vez de reenviar a quienes ya tuvieron éxito.
    // El token se convierte en SHA-256 para no usarlo como clave ni guardarlo en claro.
    const deliveryState = item.deliveryState && typeof item.deliveryState === 'object'
      ? item.deliveryState : {};
    for (const token of tokens) {
      const tokenKey = await hashPushToken(token);
      if (deliveryState[tokenKey] === 'sent') {
        successCount++;
        continue;
      }
      try {
        await sendPushNotification(env, accessToken, token, {
          title: item.title,
          body: typeof item.body === 'string' ? item.body : '',
          image: typeof item.image === 'string' ? item.image : undefined,
          url: typeof item.url === 'string' ? item.url : '/'
        });
        // Persistir cada éxito inmediatamente; si falla la escritura, detener el
        // ciclo para no seguir enviando sin poder guardar el progreso de entrega.
        await firebaseRequest(`${dbUrl}/scheduledNotifications/${encodeURIComponent(key)}/deliveryState/${tokenKey}.json`, accessToken, {
          method: 'PUT', body: JSON.stringify('sent')
        });
        deliveryState[tokenKey] = 'sent';
        successCount++;
      } catch (_error) {
        // No registrar tokens ni cuerpo de respuesta de FCM.
        failureCount++;
      }
    }

    // Los éxitos quedan marcados y se omiten en el siguiente ciclo; solo se
    // reintentan los tokens sin confirmación de entrega.
    if (failureCount > 0 || successCount === 0) {
      failed++;
      console.warn('[Cron] Hubo envíos fallidos; se reintentarán solo destinatarios sin éxito registrado.');
      continue;
    }

    await firebaseRequest(`${dbUrl}/notifications_history.json`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        ...item,
        sentAt: now,
        sentDetails: { success: successCount, failure: 0 }
      })
    });
    await firebaseRequest(`${dbUrl}/scheduledNotifications/${encodeURIComponent(key)}.json`, accessToken, {
      method: 'DELETE'
    });
    processed++;
    } finally {
      await releaseNotificationLock(dbUrl, accessToken, key, lock.owner).catch(() => {
        console.warn('[Cron] No se pudo liberar un bloqueo; expirará automáticamente.');
      });
    }
  }

  console.log(`[Cron] Ciclo terminado. Procesadas: ${processed}; pendientes con incidencias: ${failed}.`);
  return { processed, failed };
}

// Bloqueo optimista por notificación. La concesión dura 15 minutos para
// impedir que dos ejecuciones concurrentes envíen al mismo público a la vez.
// Firebase REST ETags + If-Match implementan compare-and-set.
export async function acquireNotificationLock(dbUrl, accessToken, key) {
  const url = `${dbUrl}/scheduledNotifications/${encodeURIComponent(key)}/_processingLock.json`;
  const owner = crypto.randomUUID();
  const now = Date.now();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, 'X-Firebase-ETag': 'true' }
  });
  if (!response.ok) throw new Error(`Firebase lock read failed (${response.status})`);
  const current = await response.json();
  const etag = response.headers.get('ETag');
  if (!etag) throw new Error('Firebase did not return an ETag for notification lock');
  if (current && typeof current.expiresAt === 'number' && current.expiresAt > now) return null;
  const write = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'If-Match': etag
    },
    body: JSON.stringify({ owner, expiresAt: now + 15 * 60 * 1000 })
  });
  if (write.status === 412) return null;
  if (!write.ok) throw new Error(`Firebase lock claim failed (${write.status})`);
  return { owner };
}

export async function releaseNotificationLock(dbUrl, accessToken, key, owner) {
  const url = `${dbUrl}/scheduledNotifications/${encodeURIComponent(key)}/_processingLock.json`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, 'X-Firebase-ETag': 'true' }
  });
  if (!response.ok) throw new Error(`Firebase lock read failed (${response.status})`);
  const current = await response.json();
  const etag = response.headers.get('ETag');
  if (!etag) throw new Error('Firebase did not return an ETag for notification lock');
  if (!current || current.owner !== owner) return;
  const deleted = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'If-Match': etag
    },
    body: 'null'
  });
  if (deleted.status === 412) return;
  if (!deleted.ok) throw new Error(`Firebase lock release failed (${deleted.status})`);
}

async function hashPushToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function firebaseRequest(url, accessToken, options = {}) {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(options.body ? { body: options.body } : {})
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Firebase REST request failed (${response.status}): ${errText.slice(0, 150)}`);
  }
  if (response.status === 204 || options.method === 'DELETE') return null;
  return response.json();
}

async function sendPushNotification(env, accessToken, token, notification) {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/messages:send`;
  const message = {
    message: {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        ...(notification.image ? { image: notification.image } : {})
      },
      data: {
        url: notification.url,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    }
  };

  const response = await fetch(fcmUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(message)
  });
  if (!response.ok) throw new Error(`FCM request failed (${response.status})`);
}

async function getGoogleAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: env.FIREBASE_CLIENT_EMAIL,
    scope: OAUTH_SCOPES,
    aud: OAUTH_TOKEN_URL,
    exp: now + 3600,
    iat: now
  }));
  const signingInput = `${header}.${payload}`;
  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput)
  );
  const assertion = `${signingInput}.${base64UrlEncode(signature)}`;

  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!response.ok) throw new Error(`Google OAuth token exchange failed (${response.status})`);
  const data = await response.json();
  if (!data.access_token) throw new Error('Google OAuth response did not include an access token');
  return data.access_token;
}

function getFirebaseDatabaseUrl(env) {
  const fallback = 'https://puro-llano-radio-f7166-default-rtdb.firebaseio.com';
  const value = (typeof env.FIREBASE_DATABASE_URL === 'string' && env.FIREBASE_DATABASE_URL.trim())
    ? env.FIREBASE_DATABASE_URL.trim()
    : fallback;
  let parsed;
  try { parsed = new URL(value); } catch (_error) { throw new Error('Missing or invalid FIREBASE_DATABASE_URL'); }
  const supportedHost = parsed.hostname.endsWith('.firebaseio.com') || parsed.hostname.endsWith('.firebasedatabase.app');
  if (parsed.protocol !== 'https:' || !supportedHost || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Invalid FIREBASE_DATABASE_URL');
  }
  return value.replace(/\/$/, '');
}

function validateEnv(env) {
  // CRON_SECRET is required only by the manual cron route, not by public chat/visits.
  getFirebaseDatabaseUrl(env);
  for (const name of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) {
    if (typeof env[name] !== 'string' || env[name].trim() === '') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }
}

function base64UrlEncode(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}
