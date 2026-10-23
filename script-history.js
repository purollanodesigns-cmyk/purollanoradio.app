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
        this.isLeader = false; // Este cliente es el líder?
        this.leaderCheckTimer = null;

        // Inicializar Firebase si está disponible
        this.initFirebase();
    }

    // Inicializar conexión a Firebase
    initFirebase() {
        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                this.db = firebase.database();
                this.firebaseRef = this.db.ref('radio_history/puro_llano_radio');
                historyState.firebaseConnected = true;
                console.log('✅ Firebase conectado para historial');

                // Escuchar cambios en tiempo real desde Firebase
                this.firebaseRef.on('value', (snapshot) => {
                    const data = snapshot.val();
                    if (data && data.songs) {
                        console.log('📥 Datos recibidos desde Firebase:', data.songs.length, 'canciones');
                        this.songs = data.songs;
                        this.currentSong = data.currentSong || null;
                        this.render();
                    }
                });

                // Sistema de Leader Election
                // Cada cliente verifica si debe ser el líder
                this.startLeaderElection();
            } else {
                console.log('⚠️ Firebase no está disponible');
            }
        } catch (error) {
            console.log('⚠️ Error al inicializar Firebase:', error.message);
            historyState.firebaseConnected = false;
        }
    }

    // Sistema de Leader Election
    startLeaderElection() {
        const leaderRef = this.db.ref('radio_history/puro_llano_radio/leader');
        const myId = 'client_' + Math.random().toString(36).substr(2, 9);
        const myTimestamp = Date.now();

        // Intentar convertirse en líder
        const tryBecomeLeader = () => {
            leaderRef.get().then((snapshot) => {
                const leader = snapshot.val();
                const now = Date.now();

                // Si no hay líder o el líder anterior expiró (30 segundos sin actualizar)
                if (!leader || (now - leader.timestamp > 30000)) {
                    // Intentar ser líder
                    leaderRef.set({
                        id: myId,
                        timestamp: now
                    }).then(() => {
                        this.isLeader = true;
                        console.log('👑 Soy el LÍDER - Escribiré en Firebase');
                    });
                } else {
                    this.isLeader = false;
                    console.log('👂 Soy seguidor - Solo leeré de Firebase (líder:', leader.id + ')');
                }
            }).catch(() => {
                this.isLeader = false;
            });
        };

        // Verificar liderazgo inmediatamente
        tryBecomeLeader();

        // Verificar cada 10 segundos
        this.leaderCheckTimer = setInterval(tryBecomeLeader, 10000);

        // Mantener liderazgo actualizado si soy líder
        const keepLeadership = () => {
            if (this.isLeader) {
                leaderRef.set({
                    id: myId,
                    timestamp: Date.now()
                });
            }
        };

        // Actualizar liderazgo cada 5 segundos si soy líder
        setInterval(keepLeadership, 5000);
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

        // Guardar en Firebase
        this.saveToFirebase();

        return this.songs;
    }

    // Guardar historial en Firebase
    saveToFirebase() {
        // Solo el líder escribe en Firebase
        if (!HISTORY_CONFIG.enableFirebaseSync || !this.firebaseRef || !this.isLeader) {
            if (this.isLeader) {
                console.log('💾 Guardando en Firebase (LÍDER)');
            }
            return;
        }

        try {
            this.firebaseRef.set({
                songs: this.songs,
                currentSong: this.currentSong,
                lastUpdate: Date.now(),
                station: 'puro_llano_radio',
                leader: {
                    id: 'client_' + Math.random().toString(36).substr(2, 9),
                    timestamp: Date.now()
                }
            }).then(() => {
                console.log('💾 Historial guardado en Firebase por LÍDER');
            }).catch(error => {
                console.error('❌ Error guardando en Firebase:', error);
            });
        } catch (error) {
            console.error('Error en saveToFirebase:', error);
        }
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

    // Sincronizar con el streaming
    async sync() {
        console.log('🔄 Sincronizando historial con streaming...');
        console.log('📊 Estado actual:', this.songs.length, 'canciones en historial');

        const data = await this.fetchFromStreaming();

        if (data && data.length > 0) {
            console.log(`✅ Historial sincronizado: ${this.songs.length} canciones`);
            console.log('🎵 Canción actual:', this.currentSong?.title || 'N/A');
            await this.render();
        } else {
            console.warn('⚠️ No se pudieron obtener datos del streaming');
            console.log('📊 Datos recibidos:', data);
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
                document.title = `📻 ${currentSong.title} - Puro Llano Radio`;
            }
        }
    }

    // Iniciar sincronización automática
    startAutoSync() {
        console.log('🎵 Iniciando sincronización automática del historial...');
        console.log('📡 Fuente:', HISTORY_CONFIG.statsUrl);
        console.log('🔄 Intervalo:', HISTORY_CONFIG.updateInterval / 1000, 'segundos');
        console.log('📊 Máximo de canciones:', HISTORY_CONFIG.maxItems);

        // Primera sincronización inmediata
        console.log('⏳ Primera sincronización...');
        this.sync();

        // Sincronización periódica
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

        // Detener verificación de liderazgo
        if (this.leaderCheckTimer) {
            clearInterval(this.leaderCheckTimer);
            this.leaderCheckTimer = null;
        }

        // Si soy líder, liberar liderazgo
        if (this.isLeader && this.firebaseRef) {
            this.firebaseRef.child('leader').remove();
            this.isLeader = false;
            console.log('👑 Liderazgo liberado');
        }
    }

    // Limpiar historial local y Firebase
    clear() {
        this.songs = [];
        this.currentSong = null;

        // Limpiar Firebase también
        if (this.firebaseRef) {
            this.firebaseRef.remove().then(() => {
                console.log('🗑️ Historial eliminado de Firebase');
            });
        }

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
