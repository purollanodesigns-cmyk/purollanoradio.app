/* ==========================================================================
   VISIT COUNTER MODULE - PURO LLANO RADIO
   ==========================================================================
   Patrón: Singleton + Observer
   Responsabilidad: Conteo de visitas diarias y totales con Firebase RTDB.
   Seguridad: Deduplicación por localStorage para evitar inflación artificial.
   ========================================================================== */

/**
 * @fileoverview Módulo de contador de visitas para Puro Llano Radio.
 * Registra visitas únicas por día usando Firebase Realtime Database
 * y localStorage como mecanismo de deduplicación del lado del cliente.
 */
(function () {
    'use strict';

    // ── Constantes ──────────────────────────────────────────────────────
    /** @const {string} Clave de localStorage para rastrear visita diaria */
    const STORAGE_KEY = 'plr_visit_date';

    /** @const {number} Intervalo de actualización de la fecha (ms) - cada minuto */
    const DATE_CHECK_INTERVAL = 60000;

    // ── Estado interno ──────────────────────────────────────────────────
    /** @type {boolean} Evita múltiples inicializaciones (Singleton) */
    let isInitialized = false;

    // ── Utilidades ──────────────────────────────────────────────────────

    /**
     * Obtiene la fecha actual en formato YYYY-MM-DD (zona horaria local).
     * @returns {string} Fecha formateada
     */
    function getTodayDateKey() {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit'
        }).formatToParts(new Date());
        const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
        return `${values.year}-${values.month}-${values.day}`;
    }

    /**
     * Formatea un número con separador de miles para mejor legibilidad.
     * @param {number} num - Número a formatear
     * @returns {string} Número formateado (ej: "1,234")
     */
    function formatNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        return num.toLocaleString('es-VE');
    }

    /**
     * Anima la transición de un número usando requestAnimationFrame.
     * Implementa una interpolación suave para mejorar la UX.
     * @param {HTMLElement} element - Elemento DOM donde mostrar el número
     * @param {number} targetValue - Valor final de la animación
     * @param {number} [duration=800] - Duración de la animación en ms
     */
    function animateCounter(element, targetValue, duration) {
        if (!element) return;

        duration = duration || 800;
        const startValue = parseInt(element.textContent.replace(/\D/g, ''), 10) || 0;
        const difference = targetValue - startValue;

        // Si no hay diferencia, simplemente asignar
        if (difference === 0) {
            element.textContent = formatNumber(targetValue);
            return;
        }

        const startTime = performance.now();

        /**
         * Frame de animación con easing cuadrático (ease-out).
         * @param {number} currentTime - Timestamp actual
         */
        function updateFrame(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: ease-out quad → desacelera al final
            const easedProgress = 1 - (1 - progress) * (1 - progress);
            const currentValue = Math.round(startValue + difference * easedProgress);

            element.textContent = formatNumber(currentValue);

            if (progress < 1) {
                requestAnimationFrame(updateFrame);
            } else {
                // Agregar clase de pulso al finalizar la animación
                element.classList.add('counter-pulse');
                setTimeout(function () {
                    element.classList.remove('counter-pulse');
                }, 600);
            }
        }

        requestAnimationFrame(updateFrame);
    }

    // ── Lógica de negocio ───────────────────────────────────────────────

    /**
     * Registra una nueva visita en Firebase si el usuario no ha sido
     * contado hoy. Usa transacciones atómicas para evitar race conditions.
     */
    function registerVisit() {
        var endpoint = window.CHAT_MESSAGE_ENDPOINT;
        if (typeof endpoint !== 'string' || !/^https:\/\//i.test(endpoint)) {
            console.warn('⚠️ [Visits] Configura window.CHAT_MESSAGE_ENDPOINT con la URL base HTTPS del Worker.');
            return;
        }
        var todayKey = getTodayDateKey();
        try {
            if (localStorage.getItem(STORAGE_KEY) === todayKey) {
                console.log('ℹ️ [Visits] Visita ya solicitada hoy en este navegador');
                return;
            }
        } catch (_storageError) {
            // El servidor aplica su propia deduplicación aunque localStorage no esté disponible.
        }
        fetch(endpoint.replace(/\/$/, '') + '/visits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        }).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        }).then(function (result) {
            if (!result || result.ok !== true) throw new Error('Respuesta del servidor inválida');
            try { localStorage.setItem(STORAGE_KEY, result.dateKey || todayKey); } catch (_storageError) {}
            console.log(result.counted ? '✅ [Visits] Visita registrada por el servidor' : 'ℹ️ [Visits] Ya contada desde esta conexión hoy');
        }).catch(function (error) {
            console.error('❌ [Visits] No se pudo registrar la visita:', error.message || error);
        });
    }

    /**
     * Suscribe los listeners en tiempo real de Firebase para actualizar
     * los contadores en la UI cuando cambian los datos (patrón Observer).
     */
    function subscribeToCounters() {
        try {
            var refs = window.firebaseRefs && window.firebaseRefs.visits;
            if (!refs) {
                console.warn('⚠️ [Visits] Firebase refs no disponibles para suscripción');
                return;
            }

            var todayKey = getTodayDateKey();

            // Observer: Escuchar cambios en el total
            refs.total.on('value', function (snapshot) {
                var totalValue = snapshot.val() || 0;
                var totalElement = document.getElementById('visitTotalCount');
                animateCounter(totalElement, totalValue);
            }, function (error) {
                console.error('❌ [Visits] Error al leer total:', error);
            });

            // Observer: Escuchar cambios en el conteo diario
            refs.daily.child(todayKey).on('value', function (snapshot) {
                var dailyValue = snapshot.val() || 0;
                var dailyElement = document.getElementById('visitDailyCount');
                animateCounter(dailyElement, dailyValue);
            }, function (error) {
                console.error('❌ [Visits] Error al leer diario:', error);
            });

        } catch (error) {
            console.error('❌ [Visits] Error al suscribir contadores:', error);
        }
    }

    /**
     * Verifica si la fecha cambió (medianoche) y actualiza la suscripción
     * del contador diario para reflejar el nuevo día.
     */
    function checkDateChange() {
        var todayKey = getTodayDateKey();
        var currentDateElement = document.getElementById('visitDateLabel');

        if (currentDateElement) {
            var displayedDate = currentDateElement.getAttribute('data-date');

            if (displayedDate && displayedDate !== todayKey) {
                console.log('🔄 [Visits] Cambio de día detectado, resuscribiendo...');
                currentDateElement.setAttribute('data-date', todayKey);

                // Re-suscribir al nuevo día
                var refs = window.firebaseRefs && window.firebaseRefs.visits;
                if (refs) {
                    // Desconectar listener del día anterior
                    refs.daily.child(displayedDate).off('value');

                    // Suscribir al nuevo día
                    refs.daily.child(todayKey).on('value', function (snapshot) {
                        var dailyValue = snapshot.val() || 0;
                        var dailyElement = document.getElementById('visitDailyCount');
                        animateCounter(dailyElement, dailyValue);
                    });

                    // Registrar visita del nuevo día
                    registerVisit();
                }
            }
        }
    }

    // ── Inicialización (Singleton) ──────────────────────────────────────

    /**
     * Punto de entrada principal. Inicializa el módulo de visitas
     * una sola vez (patrón Singleton) al cargar la página.
     */
    function initVisitCounter() {
        if (isInitialized) return;
        isInitialized = true;

        // Esperar a que Firebase esté disponible
        if (!window.firebaseRefs || !window.firebaseRefs.visits) {
            console.warn('⚠️ [Visits] Esperando Firebase...');
            setTimeout(initVisitCounter, 500);
            isInitialized = false;
            return;
        }

        // Configurar la etiqueta de fecha actual
        var dateLabel = document.getElementById('visitDateLabel');
        if (dateLabel) {
            dateLabel.setAttribute('data-date', getTodayDateKey());
        }

        // 1. Suscribir a los contadores (Observer)
        subscribeToCounters();

        // 2. Registrar la visita
        registerVisit();

        // 3. Verificar cambio de día periódicamente
        setInterval(checkDateChange, DATE_CHECK_INTERVAL);

        console.log('📊 [Visits] Módulo de visitas inicializado');
    }

    // ── Arranque ────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVisitCounter);
    } else {
        // DOM ya cargado, esperar un tick para que Firebase se inicialice
        setTimeout(initVisitCounter, 300);
    }

})();
