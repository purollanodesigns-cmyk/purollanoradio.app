/* ==========================================================================
   SISTEMA DE HISTORIAL DE CANCIONES - CONEXIÓN DIRECTA AL STREAMING
   Versión Mejorada 2026 - Datos en tiempo real desde el servidor
   ========================================================================== */

// Configuración del historial
const HISTORY_CONFIG = {
    // Stats directo del streaming (endpoint principal)
    statsUrl: 'https://radio.mipanel.stream:6816/stats?json=1',
    // Puerto del streaming
    port: '6816',
    // Intervalo de actualización (milisegundos)
    updateInterval: 30000, // 30 segundos
    // Máximo de canciones a mostrar
    maxItems: 10,
    // Habilitar persistencia en Firebase
    enableFirebaseSync: true // ACTIVADO para historial global compartido
};

// Estado del historial
const historyState = {
    songs: [],
    lastSong: null,
    currentSong: null,
    lastUpdate: null,
    isLoading: false,
    error: null,
    firebaseConnected: false
};

// Clase para gestionar el historial desde el streaming
class StreamingHistory {
    constructor() {
        this.songs = [];
        this.currentSong = null;
        this.syncTimer = null;
        this.historyMap = new Map();
        this.db = null;
        this.firebaseRef = null;
        this.localChanges = [];

        // Inicializar Firebase si está disponible (modo solo lectura para clientes)
        this.initFirebase();
    }

    // Inicializar conexión a Firebase (solo lectura)
    initFirebase() {
        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                this.db = firebase.database();
                this.firebaseRef = this.db.ref('radio_history/puro_llano_radio');
                historyState.firebaseConnected = true;
                console.log('✅ Firebase conectado para historial (modo tiempo real / solo lectura)');

                // Escuchar cambios en tiempo real desde Firebase (actualizados por el Cloudflare Worker)
                this.firebaseRef.on('value', (snapshot) => {
                    const data = snapshot.val();
                    if (data && data.songs) {
                        console.log('📥 Historial recibido desde Firebase:', data.songs.length, 'canciones');
                        this.songs = data.songs;
                        this.currentSong = data.currentSong || null;
                        this.render();
                    }
                });
            } else {
                console.log('⚠️ Firebase no está disponible para historial');
            }
        } catch (error) {
            console.log('⚠️ Error al inicializar Firebase para historial:', error.message);
            historyState.firebaseConnected = false;
        }
    }

    // Construir URL de la API con cache buster
    buildApiUrl(baseUrl, params = {}) {
        params.t = Date.now().toString();
        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');
        return `${baseUrl}?${queryString}`;
    }

    // Obtener historial desde el streaming
    async fetchFromStreaming() {
        if (historyState.isLoading) return null;

        historyState.isLoading = true;
        historyState.error = null;

        try {
            // Usar endpoint stats directamente
            const statsData = await this.fetchStats();
            historyState.lastUpdate = Date.now();
            historyState.isLoading = false;
            return statsData;
        } catch (error) {
            historyState.error = 'No se pudo conectar con el streaming';
            console.error('❌ Error al obtener historial:', error);
            historyState.isLoading = false;
            return null;
        }
    }

    // Obtener stats directo
    async fetchStats() {
        const cacheBuster = Date.now();
        // Usar proxy CORS para evitar bloqueos
        const apiUrl = `https://radio.mipanel.stream:6816/stats?json=1&t=${cacheBuster}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;

        console.log('📡 Obteniendo stats desde:', apiUrl);

        try {
            const response = await fetch(proxyUrl, {
                cache: 'no-store',
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                console.error('❌ Proxy respondió con error:', response.status);
                throw new Error('Proxy no disponible');
            }

            const proxyData = await response.json();

            // Parsear el contenido del proxy
            const data = typeof proxyData.contents === 'string'
                ? JSON.parse(proxyData.contents)
                : proxyData.contents;

            console.log('📊 Datos recibidos:', data);

            return this.processStatsData(data);
        } catch (error) {
            console.error('❌ Error al fetchear stats:', error);
            throw error;
        }
    }

    // Procesar datos de stats (endpoint único)
    processStatsData(currentData) {
        console.log('🔄 Procesando datos de stats:', currentData);

        if (!currentData) {
            console.warn('⚠️ currentData es vacío');
            return [];
        }

        const songTitle = currentData.songtitle || currentData.title || '';
        if (!songTitle) {
            console.warn('⚠️ No hay songtitle en los datos');
            return [];
        }

        // Separar artista y canción
        let [artist, title] = songTitle.split(' - ').map(s => s?.trim());
        if (!title) {
            title = artist;
            artist = 'Artista desconocido';
        }

        console.log('🎵 Canción procesada:', title, '|', artist);

        // Crear objeto de canción actual
        const currentSong = {
            id: `song-${Date.now()}`,
            title: title,
            artist: artist,
            startTime: Date.now(),
            youtubeLink: this.generateYouTubeLink(artist, title),
            source: 'stats',
            isCurrent: true
        };

        // Si es la misma canción, mantener el tiempo original
        if (this.currentSong && this.currentSong.title === title) {
            currentSong.startTime = this.currentSong.startTime;
            currentSong.id = this.currentSong.id;
        }

        // Actualizar canción actual
        this.currentSong = currentSong;

        // Verificar si ya está en el historial
        const existsIndex = this.songs.findIndex(s => s.title === title && s.artist === artist);

        if (existsIndex > 0) {
            // Mover al principio si ya existe
            const [existing] = this.songs.splice(existsIndex, 1);
            existing.startTime = currentSong.startTime;
            this.songs.unshift(existing);
        } else if (!this.songs.length || (this.songs[0]?.title !== title)) {
            // Agregar nueva canción al inicio
            this.songs.unshift(currentSong);

            // Limitar cantidad
            if (this.songs.length > HISTORY_CONFIG.maxItems) {
                this.songs.pop();
            }
        }

        return this.songs;
    }

    // Generar enlace de YouTube
    generateYouTubeLink(artist, song) {
        const query = encodeURIComponent(`${artist} ${song} oficial`);
        return `https://www.youtube.com/results?search_query=${query}`;
    }

    // Formatear tiempo transcurrido
    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return 'Ahora';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }

    // Renderizar en el DOM
    async render() {
        const historyList = document.getElementById('historyList');
        const historyCount = document.getElementById('historyCount');

        if (!historyList) {
            console.warn('⚠️ No se encontró #historyList en el DOM');
            return;
        }

        if (!historyCount) {
            console.warn('⚠️ No se encontró #historyCount en el DOM');
        }

        // Mostrar estado de carga
        if (historyState.isLoading && this.songs.length === 0) {
            historyList.innerHTML = `
                <div class="history-loading">
                    <i class="fa fa-spinner fa-spin"></i>
                    <p>Obteniendo canciones del streaming...</p>
                </div>
            `;
            return;
        }

        // Mostrar error si existe
        if (historyState.error && this.songs.length === 0) {
            historyList.innerHTML = `
                <div class="history-error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <p>${historyState.error}</p>
                    <button onclick="songHistory.sync()" class="history-retry-btn">
                        <i class="fa fa-refresh"></i> Reintentar
                    </button>
                </div>
            `;
            return;
        }

        // Actualizar contador
        if (historyCount) {
            const count = this.songs.length;
            historyCount.textContent = `${count} canción${count !== 1 ? 'es' : ''} en historial`;

            // Agregar indicador de actualización
            if (historyState.lastUpdate) {
                const lastUpdateEl = historyCount.querySelector('.last-update');
                if (!lastUpdateEl) {
                    const updateSpan = document.createElement('span');
                    updateSpan.className = 'last-update';
                    updateSpan.style.cssText = 'margin-left: 5px; opacity: 0.6; font-size: 0.6rem;';
                    updateSpan.innerHTML = ' <i class="fa fa-check"></i> Actualizado';
                    historyCount.appendChild(updateSpan);
                }
            }
        }

        // Si no hay canciones
        if (this.songs.length === 0) {
            historyList.innerHTML = `
                <div class="history-empty">
                    <i class="fa fa-music"></i>
                    <p>Las canciones aparecerán aquí</p>
                    <p style="font-size: 0.65rem; opacity: 0.6; margin-top: 8px;">
                        <i class="fa fa-info-circle"></i> Dale play para comenzar
                    </p>
                </div>
            `;
            return;
        }

        // Renderizar lista
        console.log('📋 Renderizando', this.songs.length, 'canciones en el historial');
        historyList.innerHTML = this.songs.map((song, index) => {
            const isCurrent = index === 0;
            const timeAgo = this.formatTimeAgo(song.startTime);

            return `
                <div class="history-item ${isCurrent ? 'current' : ''}" data-id="${song.id}">
                    <div class="history-item-content">
                        <div class="history-item-icon">
                            <i class="fa fa-${isCurrent ? 'volume-up' : 'music'}"></i>
                        </div>
                        <div class="history-item-info">
                            <div class="history-item-title">${this.escapeHtml(song.title)}</div>
                            <div class="history-item-artist">${this.escapeHtml(song.artist)}</div>
                            <a href="${song.youtubeLink}" target="_blank" class="history-youtube-btn" title="Ver en YouTube">
                                <i class="fa-brands fa-youtube"></i>
                                <span>Ver video</span>
                            </a>
                        </div>
                    </div>
                    <div class="history-item-time">
                        ${timeAgo}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Escapar HTML para prevenir XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Sincronizar con el Worker / Streaming
    async sync() {
        console.log('🔄 Sincronizando historial...');
        const endpoint = window.CHAT_MESSAGE_ENDPOINT;

        // Si el Worker está configurado, solicitar sincronización segura en el servidor
        if (typeof endpoint === 'string' && /^https:\/\//i.test(endpoint)) {
            try {
                const response = await fetch(endpoint.replace(/\/$/, '') + '/sync-history', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(8000)
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && Array.isArray(data.songs)) {
                        console.log('✅ Historial sincronizado vía Worker:', data.songs.length, 'canciones');
                        this.songs = data.songs;
                        this.currentSong = data.currentSong || null;
                        this.updateMetadataFromHistory();
                        await this.render();
                        return;
                    }
                }
            } catch (workerError) {
                console.warn('⚠️ No se pudo sincronizar vía Worker, usando respaldo local:', workerError.message || workerError);
            }
        }

        // Respaldo local de visualización si el Worker no responde
        const data = await this.fetchFromStreaming();
        if (data && data.length > 0) {
            console.log(`✅ Historial local sincronizado: ${this.songs.length} canciones`);
            this.updateMetadataFromHistory();
            await this.render();
        } else {
            console.warn('⚠️ No se pudieron obtener datos del streaming localmente');
            await this.render();
        }
    }

    // Actualizar metadata desde el historial
    updateMetadataFromHistory() {
        if (this.songs.length === 0) return;

        const currentSong = this.songs[0];
        const titleEl = document.getElementById('song-title');
        const artistEl = document.getElementById('artist-name');

        if (titleEl && artistEl && currentSong) {
            const displayedSong = titleEl.innerText.replace('📻 ', '');

            if (displayedSong !== currentSong.title) {
                titleEl.innerText = `📻 ${currentSong.title}`;
                artistEl.innerText = currentSong.artist;
                // Marquesina en la pestaña del navegador
                if (typeof startTabMarquee === 'function') {
                    startTabMarquee(`🎵 ${currentSong.title} - Puro Llano Radio`);
                } else {
                    document.title = `📻 ${currentSong.title} - Puro Llano Radio`;
                }
            }
        }
    }

    // Iniciar sincronización automática
    startAutoSync() {
        console.log('🎵 Iniciando sincronización del historial...');
        console.log('🔄 Intervalo:', HISTORY_CONFIG.updateInterval / 1000, 'segundos');

        // Primera sincronización
        this.sync();

        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(() => {
            this.sync();
        }, HISTORY_CONFIG.updateInterval);
    }

    // Detener sincronización
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    // Limpiar vista local del historial
    clear() {
        this.songs = [];
        this.currentSong = null;
        this.render();
    }
}

// Instancia global del historial
const songHistory = new StreamingHistory();

// Función global para limpiar historial
window.clearHistory = function () {
    if (confirm('¿Estás seguro de que deseas limpiar el historial? Esta acción no se puede deshacer.')) {
        songHistory.clear();
    }
};

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    console.log('🎵 Iniciando sistema de historial...');

    // Esperar a que Firebase se inicialice (si está disponible)
    setTimeout(() => {
        console.log('🚀 Comenzando sincronización automática');
        songHistory.startAutoSync();
    }, 1500);
});

// Sincronizar también al reproducir por primera vez
const originalTogglePlay = window._togglePlay;
if (originalTogglePlay) {
    window._togglePlay = async function () {
        const wasPlaying = !audio.paused;

        await originalTogglePlay.apply(this, arguments);

        // Si comenzó a reproducir, forzar sincronización
        if (!wasPlaying && !audio.paused) {
            setTimeout(() => songHistory.sync(), 2000);
        }
    };
}

// Limpiar timers al cerrar
window.addEventListener('beforeunload', function () {
    songHistory.stopAutoSync();

    // Desconectar Firebase listener
    if (songHistory.firebaseRef) {
        songHistory.firebaseRef.off();
    }
});
