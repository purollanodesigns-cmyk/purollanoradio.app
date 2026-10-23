/**
 * PurollanoRadio - Worker de notificaciones programadas.
 * Preparado para revisión local; no desplegar hasta completar las pruebas.
 * Requiere los secretos: CRON_SECRET, FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.
 */

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
// Host confirmado por el operador en Firebase Console.
const FIREBASE_DATABASE_URL = 'https://puro-llano-radio-f7166-default-rtdb.firebaseio.com';
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/firebase.messaging'
].join(' ');

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(processNotifications(env));
  },

  // Endpoint manual: solo POST + Authorization: Bearer <CRON_SECRET>.
  // Nunca se acepta el secreto en query params.
  async fetch(request, env) {
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
      // No exponer detalles internos, credenciales, tokens ni respuestas upstream.
      console.error('[Cron] Falló el procesamiento. Revisar configuración y permisos.');
      return json({ error: 'Error interno al procesar notificaciones' }, 500);
    }
  }
};

async function processNotifications(env) {
  validateEnv(env);
  console.log('[Cron] Iniciando revisión de notificaciones programadas.');

  const accessToken = await getGoogleAccessToken(env);
  const dbUrl = FIREBASE_DATABASE_URL;
  const now = Date.now();

  const scheduledUrl = `${dbUrl}/scheduledNotifications.json?orderBy=%22scheduledTime%22&endAt=${now}`;
  const pending = await firebaseRequest(scheduledUrl, accessToken);
  if (!pending || typeof pending !== 'object' || Object.keys(pending).length === 0) {
    console.log('[Cron] No hay notificaciones pendientes.');
    return { processed: 0, status: 'no_pending_notifications' };
  }

  const tokensData = await firebaseRequest(`${dbUrl}/pushTokens.json`, accessToken);
  const tokens = tokensData && typeof tokensData === 'object'
    ? [...new Set(Object.values(tokensData).filter(value => typeof value === 'string' && value.length > 0))]
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

    let successCount = 0;
    let failureCount = 0;
    for (const token of tokens) {
      try {
        await sendPushNotification(env, accessToken, token, {
          title: item.title,
          body: typeof item.body === 'string' ? item.body : '',
          image: typeof item.image === 'string' ? item.image : undefined,
          url: typeof item.url === 'string' ? item.url : '/'
        });
        successCount++;
      } catch (_error) {
        // No registrar tokens ni cuerpo de respuesta de FCM.
        failureCount++;
      }
    }

    // Si hay cualquier fallo, conservar la entrada para revisión/reintento.
    // Atención: esto puede duplicar envíos ya exitosos en un reintento; para
    // evitarlo se necesita estado/idempotencia por token antes de producción.
    if (failureCount > 0 || successCount === 0) {
      failed++;
      console.warn('[Cron] Hubo envíos fallidos; la notificación se conserva pendiente.');
      continue;
    }

    await firebaseRequest(`${dbUrl}/notificationsHistory.json`, accessToken, {
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
  }

  console.log(`[Cron] Ciclo terminado. Procesadas: ${processed}; pendientes con incidencias: ${failed}.`);
  return { processed, failed };
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
    // No propagar cuerpos de error que puedan contener datos internos.
    throw new Error(`Firebase REST request failed (${response.status})`);
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

function validateEnv(env) {
  for (const name of ['CRON_SECRET', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) {
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
