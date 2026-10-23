/* ==========================================================================
   SERVICE WORKER - PURO LLANO RADIO
   Funcionalidad offline y caché
   ========================================================================== */

const CACHE_NAME = 'puro-llano-radio-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script-main.js',
    '/script-history.js',
    '/script-listeners.js',
    '/script-visits.js',
    '/script-greetings.js',
    '/notifications.js',
    '/chat-script.js',
    '/firebase.js',
    '/manifest.json',
    '/top5.html',
    '/programacion.html',
    '/chat.html',
    'https://purollanoradio.com/PUROLLANORADIO-COM-ICONO.png',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&family=Orbitron:wght@600&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    console.log('🔧 Instalando Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('💾 Cacheando recursos estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Recursos cacheados exitosamente');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Error al cachear:', error);
            })
    );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
    console.log('🔄 Activando Service Worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ Eliminando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activado');
                return self.clients.claim();
            })
    );
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
    // Ignorar peticiones que no sean GET
    if (event.request.method !== 'GET') return;

    // Ignorar dominios externos (excepto CDN)
    const url = new URL(event.request.url);
    if (url.hostname !== self.location.hostname && 
        !url.hostname.includes('googleapis.com') &&
        !url.hostname.includes('cloudflare.com') &&
        !url.hostname.includes('purollanoradio.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Devolver desde caché y actualizar en segundo plano
                    event.waitUntil(updateCache(event.request));
                    return cachedResponse;
                }

                // Si no está en caché, intentar red
                return fetchAndCache(event.request);
            })
            .catch((error) => {
                console.error('❌ Error en fetch:', error);
                
                // Si es navegación y falla, devolver offline page
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                
                return new Response('Offline', { status: 503 });
            })
    );
});

// Fetch y cachear
async function fetchAndCache(request) {
    const response = await fetch(request);
    
    // Solo cachear respuestas exitosas
    if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
    }
    
    return response;
}

// Actualizar caché en segundo plano
async function updateCache(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response);
        }
    } catch (error) {
        // Sin conexión, ignorar
    }
}

// Notificar a los clientes cuando hay actualización
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((cacheName) => {
                caches.delete(cacheName);
            });
        });
    }
});

// Background Sync (para cuando haya conexión)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-history') {
        event.waitUntil(syncHistory());
    }
});

async function syncHistory() {
    // Sincronizar historial cuando haya conexión
    console.log('🔄 Sincronizando historial en segundo plano...');
}

// Push Notifications - Soporte para Payloads Enriquecidos
self.addEventListener('push', (event) => {
    let data = {
        title: 'Puro Llano Radio 🤠',
        body: 'Nueva actualización en vivo',
        icon: 'https://purollanoradio.com/PUROLLANORADIO-COM-ICONO.png',
        image: null,
        url: '/'
    };

    if (event.data) {
        try {
            const payload = event.data.json();
            // FCM puede enviar la info en notification o en data
            const notif = payload.notification || {};
            const extraData = payload.data || {};
            
            data.title = notif.title || extraData.title || data.title;
            data.body = notif.body || extraData.body || data.body;
            data.image = notif.image || extraData.image || null;
            data.url = extraData.url || '/';
        } catch (e) {
            // Si no es JSON, usar texto plano
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.icon,
        image: data.image,
        vibrate: [200, 100, 200, 100, 400],
        data: {
            url: data.url,
            dateOfArrival: Date.now()
        },
        actions: [
            { action: 'open', title: 'Abrir Radio' },
            { action: 'close', title: 'Ignorar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Click en notificación - Navegación Inteligente
self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const action = event.action;
    const targetUrl = (notification.data && notification.data.url) || '/';

    notification.close();

    if (action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Intentar encontrar una pestaña que ya tenga la URL o la raíz
                for (const client of clientList) {
                    const clientUrl = new URL(client.url).pathname;
                    const targetPath = new URL(targetUrl, self.location.origin).pathname;
                    
                    if (clientUrl === targetPath && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Si no hay pestaña abierta, abrir una nueva
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});

console.log('📡 Service Worker de Puro Llano Radio cargado');
