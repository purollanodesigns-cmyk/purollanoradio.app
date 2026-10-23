/* ==========================================================================
   SISTEMA DE OYENTES CONECTADOS - VERSIÓN ROBUSTA 2026
   Usa endpoints que realmente funcionan (stats?json=1)
   ========================================================================== */

// Configuración del sistema
const LISTENERS_CONFIG = {
    // Endpoint principal que funciona
    statsUrl: 'https://radio.mipanel.stream:6816/stats?json=1',
    // Intervalo de actualización
    updateInterval: 20000, // 20 segundos
    // Habilitar Firebase
    enableFirebaseSync: false
};

// Estado del sistema
const listenersState = {
    totalListeners: 0,
    peakListeners: 0,
    uniqueListeners: 0,
    streamHits: 0,
    lastUpdate: null,
    isLoading: false,
    error: null,
    historicalData: [] // Para mostrar tendencias
};

// Clase principal
class ListenersTracker {
    constructor() {
        this.syncTimer = null;
        this.db = null;
        this.firebaseRef = null;

        // Datos actuales
        this.currentData = {
            total: 0,
            peak: 0,
            unique: 0,
            hits: 0
        };

        // Histórico para tendencias (últimas 24 horas)
        this.historicalData = [];

        this.initFirebase();
    }

    // Inicializar Firebase
    initFirebase() {
        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                this.db = firebase.database();
                this.firebaseRef = this.db.ref('radio_listeners/puro_llano_radio');
                console.log('✅ Firebase conectado para oyentes');

                this.firebaseRef.on('value', (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        this.currentData = data.current || {};
                        this.historicalData = data.history || [];
                        this.render();
                    }
                });
            }
        } catch (error) {
            console.log('⚠️ Firebase no disponible para oyentes');
        }
    }

    // Obtener datos del streaming
    async fetchListeners() {
        if (listenersState.isLoading) return null;

        listenersState.isLoading = true;
        listenersState.error = null;

        try {
            const cacheBuster = Date.now();
            const apiUrl = `${LISTENERS_CONFIG.statsUrl}&t=${cacheBuster}`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;

            console.log('📡 Obteniendo oyentes desde:', apiUrl);

            const response = await fetch(proxyUrl, {
                cache: 'no-store',
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) {
                throw new Error('Proxy no disponible');
            }

            const proxyData = await response.json();
            const data = typeof proxyData.contents === 'string'
                ? JSON.parse(proxyData.contents)
                : proxyData.contents;

            console.log('📊 Datos de oyentes recibidos:', data);

            listenersState.lastUpdate = Date.now();
            listenersState.isLoading = false;

            return this.processData(data);

        } catch (error) {
            console.error('❌ Error al obtener oyentes:', error);
            listenersState.error = 'No se pudo conectar con el streaming';
            listenersState.isLoading = false;
            return null;
        }
    }

    // Procesar datos
    processData(data) {
        if (!data) return null;

        // Extraer datos principales
        const currentListeners = parseInt(data.currentlisteners) || 0;
        const peakListeners = parseInt(data.peaklisteners) || 0;
        const uniqueListeners = parseInt(data.uniquelisteners) || 0;
        const streamHits = parseInt(data.streamhits) || 0;
        const avgTime = parseInt(data.averagetime) || 0;

        // Actualizar estado
        listenersState.totalListeners = currentListeners;
        listenersState.peakListeners = peakListeners;
        listenersState.uniqueListeners = uniqueListeners;
        listenersState.streamHits = streamHits;

        // Actualizar datos actuales
        this.currentData = {
            total: currentListeners,
            peak: peakListeners,
            unique: uniqueListeners,
            hits: streamHits,
            avgTime: avgTime
        };

        // Agregar al histórico para tendencias
        this.addToHistory(currentListeners);

        // Guardar en Firebase
        this.saveToFirebase();

        return this.currentData;
    }

    // Agregar al histórico
    addToHistory(count) {
        const now = Date.now();

        // Agregar nuevo punto
        this.historicalData.push({
            timestamp: now,
            listeners: count,
            time: new Date(now).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
        });

        // Mantener solo últimas 24 horas (aprox 100 puntos)
        if (this.historicalData.length > 100) {
            this.historicalData.shift();
        }
    }

    // Guardar en Firebase
    saveToFirebase() {
        if (!LISTENERS_CONFIG.enableFirebaseSync || !this.firebaseRef) return;

        this.firebaseRef.set({
            current: this.currentData,
            history: this.historicalData,
            lastUpdate: Date.now(),
            station: 'puro_llano_radio'
        }).catch(error => {
            console.error('❌ Error guardando en Firebase:', error);
        });
    }

    // Formatear número
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // Formatear tiempo promedio
    formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }

    // Renderizar en el DOM
    async render() {
        const listenersList = document.getElementById('listenersList');
        const totalListeners = document.getElementById('totalListeners');
        const lastUpdate = document.getElementById('lastUpdate');

        if (!listenersList) {
            console.warn('⚠️ No se encontró #listenersList');
            return;
        }

        // Estado de carga
        if (listenersState.isLoading && this.currentData.total === 0) {
            listenersList.innerHTML = `
                <div class="listeners-loading">
                    <i class="fa fa-spinner fa-spin"></i>
                    <p>Conectando con el streaming...</p>
                </div>
            `;
            return;
        }

        // Error
        if (listenersState.error && this.currentData.total === 0) {
            listenersList.innerHTML = `
                <div class="listeners-error">
                    <i class="fa fa-exclamation-triangle"></i>
                    <p>${listenersState.error}</p>
                    <button onclick="listenersTracker.sync()" class="listeners-retry-btn">
                        <i class="fa fa-refresh"></i> Reintentar
                    </button>
                </div>
            `;
            return;
        }

        // Actualizar total en header
        if (totalListeners) {
            totalListeners.innerHTML = `
                <i class="fa fa-headphones"></i>
                ${this.formatNumber(this.currentData.total)}
            `;
        }

        // Actualizar hora
        if (lastUpdate && listenersState.lastUpdate) {
            const time = new Date(listenersState.lastUpdate);
            const timeStr = time.toLocaleTimeString('es-VE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            lastUpdate.innerHTML = `<i class="fa fa-clock"></i> Actualizado: ${timeStr}`;
        }

        // Sin oyentes
        if (this.currentData.total === 0) {
            listenersList.innerHTML = this.renderEmpty();
            return;
        }

        // Con oyentes - mostrar estadísticas
        listenersList.innerHTML = this.renderStats();
    }

    // Renderizar estado vacío
    renderEmpty() {
        return `
            <div class="listeners-empty">
                <i class="fa fa-radio"></i>
                <p>Esperando oyentes...</p>
                <p style="font-size: 0.65rem; opacity: 0.6; margin-top: 8px;">
                    <i class="fa fa-info-circle"></i> Los datos aparecerán cuando haya oyentes
                </p>
            </div>
        `;
    }

    // Renderizar estadísticas
    renderStats() {
        const data = this.currentData;

        // Calcular tendencia
        const trend = this.calculateTrend();
        const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
        const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-stable';
        const trendText = trend > 0 ? `+${trend}` : trend;

        return `
            <div class="listeners-stats-container">
                <!-- Estadística Principal -->
                <div class="listener-stat-card main-stat">
                    <div class="stat-icon">
                        <i class="fa fa-headphones"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-label">Oyentes Actuales</div>
                        <div class="stat-value">${this.formatNumber(data.total)}</div>
                        <div class="stat-trend ${trendClass}">
                            ${trendIcon} ${trendText} últimos 5 min
                        </div>
                    </div>
                </div>

                <!-- Estadísticas Secundarias -->
                <div class="listener-stats-grid">
                    <div class="listener-stat-card">
                        <div class="stat-icon small">
                            <i class="fa fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Pico del Día</div>
                            <div class="stat-value">${this.formatNumber(data.peak)}</div>
                        </div>
                    </div>

                    <div class="listener-stat-card">
                        <div class="stat-icon small">
                            <i class="fa fa-users"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Únicos Total</div>
                            <div class="stat-value">${this.formatNumber(data.unique)}</div>
                        </div>
                    </div>

                    <div class="listener-stat-card">
                        <div class="stat-icon small">
                            <i class="fa fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Tiempo Promedio</div>
                            <div class="stat-value">${this.formatTime(data.avgTime || 0)}</div>
                        </div>
                    </div>

                    <div class="listener-stat-card">
                        <div class="stat-icon small">
                            <i class="fa fa-play"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-label">Total Reproducciones</div>
                            <div class="stat-value">${this.formatNumber(data.hits)}</div>
                        </div>
                    </div>
                </div>

                <!-- Mini Gráfico de Tendencia -->
                ${this.renderMiniChart()}
            </div>
        `;
    }

    // Calcular tendencia (últimos 5 minutos)
    calculateTrend() {
        if (this.historicalData.length < 2) return 0;

        const now = Date.now();
        const fiveMinAgo = now - (5 * 60 * 1000);

        // Encontrar puntos relevantes
        const recentPoints = this.historicalData.filter(p => p.timestamp >= fiveMinAgo);

        if (recentPoints.length < 2) return 0;

        const first = recentPoints[0].listeners;
        const last = recentPoints[recentPoints.length - 1].listeners;

        return last - first;
    }

    // Renderizar mini gráfico
    renderMiniChart() {
        if (this.historicalData.length < 5) return '';

        const recentData = this.historicalData.slice(-20); // Últimos 20 puntos
        const maxListeners = Math.max(...recentData.map(d => d.listeners), 1);

        const bars = recentData.map(d => {
            const height = Math.round((d.listeners / maxListeners) * 100);
            return `<div class="chart-bar" style="height: ${height}%" title="${d.time}: ${d.listeners} oyentes"></div>`;
        }).join('');

        return `
            <div class="listeners-mini-chart">
                <div class="chart-title">
                    <i class="fa fa-chart-area"></i> Actividad Reciente
                </div>
                <div class="chart-bars">
                    ${bars}
                </div>
            </div>
        `;
    }

    // Sincronizar
    async sync() {
        console.log('🔄 Sincronizando oyentes...');

        const data = await this.fetchListeners();

        if (data) {
            console.log(`✅ Oyentes: ${data.total} actuales, ${data.peak} pico, ${data.unique} únicos`);
            await this.render();
        } else {
            console.warn('⚠️ No se pudieron obtener datos de oyentes');
            await this.render();
        }
    }

    // Iniciar
    startAutoSync() {
        console.log('📊 Iniciando sistema de oyentes...');
        console.log('📡 Fuente:', LISTENERS_CONFIG.statsUrl);
        console.log('🔄 Intervalo:', LISTENERS_CONFIG.updateInterval / 1000, 'segundos');

        this.sync();

        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(() => {
            this.sync();
        }, LISTENERS_CONFIG.updateInterval);
    }

    // Detener
    stopAutoSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }
}

// Instancia global
const listenersTracker = new ListenersTracker();

// Iniciar
document.addEventListener('DOMContentLoaded', function () {
    console.log('🎵 Iniciando sistema de oyentes...');
    setTimeout(() => {
        listenersTracker.startAutoSync();
    }, 2000);
});

// Limpiar al cerrar
window.addEventListener('beforeunload', function () {
    listenersTracker.stopAutoSync();
    if (listenersTracker.firebaseRef) {
        listenersTracker.firebaseRef.off();
    }
});
