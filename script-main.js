/* ==========================================================================
   PURO LLANO RADIO - SCRIPT PRINCIPAL
   ========================================================================== */

// Variables globales
const audio = document.getElementById('audio');
const playIcon = document.getElementById('playIcon');
const vinylRecord = document.getElementById('vinylRecord');
const progressBar = document.getElementById('progressBar');
const progressCursor = document.getElementById('progressCursor');
const currentTimeEl = document.getElementById('currentTime');
const volumeSlider = document.getElementById('volume-slider');
const volDownIcon = document.getElementById('vol-down-icon');
const streamUrl = "https://radio.mipanel.stream:6816/stream";

let audioCtx, analyser, source;
let lastVolume = 0.8;
let estabaReproduciendo = false;
let connectionStartTime = null;
let connectionTimerInterval = null;

// Canvas de fondo
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');
let particles = [];
let audioIntensity = 0;

// Frases llaneras
const frasesLlaneras = [
    "Afinando el arpa...",
    "Alistando los capachos...",
    "Templando las cuerdas...",
    "Cargando joropo bueno...",
    "Preparando la faena...",
    "Sintonizando el sentimiento...",
    "Acomodando el sombrero..."
];

// ==========================================================================
// INICIALIZAR DESPUÉS DE CARGAR DOM
// ==========================================================================
document.addEventListener('DOMContentLoaded', function () {

    /* ==========================
       ICONO MENU
    ========================== */
    const menuToggle = document.getElementById('menuToggle');
    const mainSidebar = document.getElementById('mainSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Función para abrir el menú
    function openMenu() {
        mainSidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        menuToggle.classList.add('open');
        menuToggle.querySelector('i').className = 'fa fa-times';
    }

    // Función para cerrar el menú
    function closeMenu() {
        mainSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        menuToggle.classList.remove('open');
        menuToggle.querySelector('i').className = 'fa fa-bars';
    }

    // Toggle del botón principal
    if (menuToggle) {
        menuToggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (mainSidebar.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
    }

    // Cerrar con el overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMenu);
    }

    // Cerrar con la tecla Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && mainSidebar.classList.contains('active')) {
            closeMenu();
        }
    });

    /* ==========================
       NOTIFICACIONES
       Delegado a notifications.js (OneSignal + Web Notification API)
       Las funciones globales subscribeNotifications() y toggleNotifications()
       son definidas en ese módulo.
    ========================== */

    /* ==========================
       WHATSAPP CON DETECCIÓN DE TIEMPO
    ========================== */
    window.contactarWhatsAppTiempo = function (event) {
        if (event) event.preventDefault();

        const telefono = "584164242274";
        const ahora = new Date();
        const hora = ahora.getHours();
        let saludo = "Hola";
        let momentoDia = "";

        if (hora >= 5 && hora < 12) {
            saludo = "¡Buenos días!";
            momentoDia = "mañana";
        } else if (hora >= 12 && hora < 19) {
            saludo = "¡Buenas tardes!";
            momentoDia = "tarde";
        } else {
            saludo = "¡Buenas noches!";
            momentoDia = "noche";
        }

        const songTitle = document.getElementById('song-title')?.innerText.replace('📻 ', '') || 'la mejor música llanera';
        const artistName = document.getElementById('artist-name')?.innerText || '';

        const mensaje = `${saludo} 🤠\n\nEspero que estés teniendo una excelente ${momentoDia}.\n\nEstoy escuchando en *Puro Llano Radio*:\n🎵 *${songTitle}*${artistName ? '\n🎤 ' + artistName : ''}\n\n¡Quédate conectado y disfruta del mejor folklore llanero! 📻🇻🇪\n\n_${ahora.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}_`;

        const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    }

    // Hacer funciones globales
    window.openMenu = openMenu;
    window.closeMenu = closeMenu;

    /* ==========================
       ATAJOS DE TECLADO - KEYBOARD SHORTCUTS
    ========================== */
    const keyboardHint = document.getElementById('keyboardShortcutsHint');

    // Manejar atajos de teclado
    document.addEventListener('keydown', function (e) {
        // No capturar teclas si estamos en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const playBtn = document.getElementById('playBtn');
        const volumeSlider = document.getElementById('volume-slider');

        switch (e.key) {
            case ' ':
                // Space: Play/Pause
                e.preventDefault();
                if (typeof window.togglePlay === 'function') {
                    window.togglePlay();
                }
                break;

            case 'm':
            case 'M':
                // M: Mute/Unmute
                e.preventDefault();
                if (typeof window.toggleMute === 'function') {
                    window.toggleMute();
                }
                break;

            case 'ArrowUp':
                // Arrow Up: Subir volumen
                e.preventDefault();
                if (volumeSlider) {
                    const newVol = Math.min(parseFloat(volumeSlider.value) + 0.1, 1);
                    volumeSlider.value = newVol;
                    if (audio) {
                        audio.volume = newVol;
                    }
                    if (typeof updateVolumeUI === 'function') {
                        updateVolumeUI(newVol);
                    }
                }
                break;

            case 'ArrowDown':
                // Arrow Down: Bajar volumen
                e.preventDefault();
                if (volumeSlider) {
                    const newVol = Math.max(parseFloat(volumeSlider.value) - 0.1, 0);
                    volumeSlider.value = newVol;
                    if (audio) {
                        audio.volume = newVol;
                    }
                    if (typeof updateVolumeUI === 'function') {
                        updateVolumeUI(newVol);
                    }
                }
                break;

            case 'h':
            case 'H':
                // H: Mostrar/Ocultar menú
                e.preventDefault();
                const mainSidebar = document.getElementById('mainSidebar');
                if (mainSidebar.classList.contains('active')) {
                    if (typeof window.closeMenu === 'function') {
                        window.closeMenu();
                    }
                } else {
                    if (typeof window.openMenu === 'function') {
                        window.openMenu();
                    }
                }
                break;

            case 'c':
            case 'C':
                // C: Abrir/Cerrar chat
                e.preventDefault();
                if (typeof window.toggleChatInterno === 'function') {
                    window.toggleChatInterno();
                }
                break;

            case '?':
                // ?: Mostrar/Ocultar atajos
                e.preventDefault();
                if (keyboardHint) {
                    if (keyboardHint.classList.contains('show')) {
                        keyboardHint.classList.remove('show');
                    } else {
                        keyboardHint.classList.add('show');
                        clearTimeout(hintTimeout);
                        setTimeout(() => {
                            keyboardHint.classList.remove('show');
                        }, 8000);
                    }
                }
                break;

            case 'Escape':
                // Escape: Cerrar hint si está visible
                if (keyboardHint && keyboardHint.classList.contains('show')) {
                    keyboardHint.classList.remove('show');
                }
                break;
        }
    });
});

/* ==========================
   CHAT INTERNO - TOGGLE PANEL
   (La funcionalidad del chat ahora está en chat-script.js)
========================== */

/* ==========================
   ESTADÍSTICAS DE OYENTES
========================== */
async function fetchRadioStats() {
    const listenerElement = document.getElementById('listenerCount');

    try {
        // Método principal: API directa de CyboRadio
        const cacheBuster = Date.now();
        const apiUrl = 'https://radio.mipanel.stream/api/nowplaying/puro_llano_radio';

        const res = await fetch(apiUrl + '?t=' + cacheBuster, {
            cache: 'no-store',
            headers: {
                'Accept': 'application/json'
            },
            timeout: 5000
        });

        if (!res.ok) throw new Error('API no disponible');

        const data = await res.json();

        let listeners = 0;
        if (data.listeners && data.listeners.unique !== undefined) {
            listeners = data.listeners.unique;
        } else if (data.listeners && data.listeners.total !== undefined) {
            listeners = data.listeners.total;
        } else if (typeof data.listeners === 'number') {
            listeners = data.listeners;
        }

        if (listenerElement && listeners >= 0) {
            const currentCount = parseInt(listenerElement.innerText) || 0;
            if (listeners !== currentCount) {
                listenerElement.innerText = listeners;
                listenerElement.classList.remove('pulse');
                void listenerElement.offsetWidth;
                listenerElement.classList.add('pulse');
            }
        }
    } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        // Método alternativo: Leer del iframe visible
        try {
            const iframe = document.querySelector('.widget-oyentes iframe');
            if (iframe) {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                if (iframeDoc) {
                    const text = iframeDoc.body.innerText || iframeDoc.body.textContent;
                    const numMatch = text.match(/(\d+)/);
                    if (numMatch && listenerElement) {
                        const listeners = parseInt(numMatch[1]);
                        if (listeners > 0) {
                            listenerElement.innerText = listeners;
                            listenerElement.classList.remove('pulse');
                            void listenerElement.offsetWidth;
                            listenerElement.classList.add('pulse');
                            return;
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error leyendo iframe:", e);
        }

        if (listenerElement) {
            listenerElement.innerText = '0';
        }
    }
}

// Escuchar cuando el iframe del widget cargue
window.addEventListener('load', function () {
    setTimeout(fetchRadioStats, 2000);
});

setInterval(fetchRadioStats, 15000);
fetchRadioStats();

/* ==========================
   PARTICULAS DE FONDO
========================== */
function initParticles() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    particles = [];
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            size: Math.random() * 1.5 + 0.5,
            baseSpeed: Math.random() * 0.4 + 0.1,
            opacity: Math.random() * 0.4
        });
    }
}

function drawParticles() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.fillStyle = '#fed202';
    particles.forEach(p => {
        let currentOpacity = p.opacity + (audioIntensity * 0.4);
        let currentSpeed = p.baseSpeed + (audioIntensity * 3);
        bgCtx.globalAlpha = Math.min(currentOpacity, 0.7);
        bgCtx.beginPath();
        bgCtx.arc(p.x, p.y, p.size + (audioIntensity * 1.5), 0, Math.PI * 2);
        bgCtx.fill();
        p.y -= currentSpeed;
        if (p.y < -20) { p.y = bgCanvas.height + 20; p.x = Math.random() * bgCanvas.width; }
    });
    requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', initParticles);
initParticles();
drawParticles();

/* ==========================
   AUDIO
========================== */
function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 64;
    // Nota: visualizer desactivado en el nuevo diseño de tocadiscos
    // drawVisual();
}

/* Función drawVisual desactivada - ya no se usa en el nuevo diseño
function drawVisual() {
    requestAnimationFrame(drawVisual);
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i] - 128);
    }
    const average = sum / dataArray.length;
    const intensity = Math.min(average / 40, 1);

    const canvas = document.getElementById("visualizer");
    const canvasCtx = canvas.getContext("2d");
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 6;
    canvasCtx.strokeStyle = '#fed202';
    canvasCtx.lineJoin = 'round';
    canvasCtx.lineCap = 'round';
    canvasCtx.beginPath();

    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;
    const ampFactor = 1.8;

    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const yNeutral = canvas.height / 2;
        const yOffset = (v - 1) * yNeutral * ampFactor;
        const y = yNeutral + yOffset;

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
    }

    canvasCtx.stroke();
}
*/

/* ==========================
   PLAY / PAUSE
========================== */
window._togglePlay = async function () {
    const titleEl = document.getElementById('song-title');
    const artistEl = document.getElementById('artist-name');
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');

    if (audio.paused) {
        estabaReproduciendo = true;

        if (typeof initAudio === "function") initAudio();
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

        playIcon.className = 'fa fa-spinner fa-spin';
        playBtn.disabled = true;

        const fraseAzar = frasesLlaneras[Math.floor(Math.random() * frasesLlaneras.length)];
        titleEl.innerText = fraseAzar;
        artistEl.innerText = "Conectando al Llano...";

        audio.src = streamUrl + "?t=" + Date.now();
        audio.volume = 0;

        try {
            if (typeof actualizarEstadoSignal === "function") actualizarEstadoSignal(true);
            await audio.play();

            let vol = 0;
            const targetVol = document.getElementById('volume-slider') ? parseFloat(document.getElementById('volume-slider').value) : 0.9;

            const fadeInInterval = setInterval(() => {
                if (vol < targetVol) {
                    vol += 0.05;
                    audio.volume = Math.min(vol, targetVol);
                } else {
                    clearInterval(fadeInInterval);
                }
            }, 100);

            playIcon.className = 'fa fa-pause';
            playIcon.style.marginLeft = '3px';
            playBtn.disabled = false;

            // Activar vinilo
            if (vinylRecord) vinylRecord.classList.add('spinning');
            playBtn.classList.add('playing');

            // Iniciar contador de tiempo de conexión
            startConnectionTimer();

            updateMetadata();

        } catch (err) {
            console.error("Error al reproducir:", err);
            estabaReproduciendo = false;

            playIcon.className = 'fa fa-play';
            playBtn.disabled = false;
            titleEl.innerText = "Señal no disponible ❌";

            if (typeof actualizarEstadoSignal === "function") actualizarEstadoSignal(false);
        }

    } else {
        estabaReproduciendo = false;

        if (typeof actualizarEstadoSignal === "function") actualizarEstadoSignal(false);

        let vol = audio.volume;
        const fadeOutInterval = setInterval(() => {
            if (vol > 0.1) {
                vol -= 0.1;
                audio.volume = vol;
            } else {
                audio.pause();
                audio.src = "";
                clearInterval(fadeOutInterval);

                playIcon.className = 'fa fa-play';
                playIcon.style.marginLeft = '0';

                // Detener vinilo
                if (vinylRecord) vinylRecord.classList.remove('spinning');
                playBtn.classList.remove('playing');

                // Detener contador de tiempo
                stopConnectionTimer();

                titleEl.innerText = "¡Toca Play para sentir el Llano! 🤠";
                artistEl.innerText = "Emisora Online del Folklore Llanero";
            }
        }, 50);
    }
}

// Wrapper global para togglePlay
window.togglePlay = function () {
    if (typeof window._togglePlay === 'function') window._togglePlay();
};

/* ==========================
   CONTROL DE VOLUMEN
========================== */
function updateVolumeUI(value) {
    const percentage = (value - volumeSlider.min) / (volumeSlider.max - volumeSlider.min) * 100;
    volumeSlider.style.setProperty('--volume-before', percentage + '%');

    if (value == 0) {
        volDownIcon.className = 'fa fa-volume-mute';
        volDownIcon.style.color = '#ff4444';
    } else {
        volDownIcon.className = 'fa fa-volume-down';
        volDownIcon.style.color = '#fed202';
    }
}

window._toggleMute = function () {
    if (audio.volume > 0) {
        lastVolume = audio.volume;
        audio.volume = 0;
        volumeSlider.value = 0;
    } else {
        audio.volume = lastVolume > 0.1 ? lastVolume : 0.5;
        volumeSlider.value = audio.volume;
    }
    updateVolumeUI(volumeSlider.value);
}

window.toggleMute = function () {
    if (typeof window._toggleMute === 'function') window._toggleMute();
};

volumeSlider.addEventListener('input', (e) => {
    audio.volume = e.target.value;
    updateVolumeUI(e.target.value);
});

// Inicializar volumen
const initPercent = (volumeSlider.value - volumeSlider.min) / (volumeSlider.max - volumeSlider.min) * 100;
volumeSlider.style.setProperty('--volume-before', initPercent + '%');

/* NOTA: El sistema de historial ahora está en script-history.js */

/* ==========================================================================
   SISTEMA DE METADATOS - MODELO OPTIMIZADO CON CACHÉ
   ========================================================================== */

// NOTA: frasesLlaneras ya está definido globalmente al inicio del archivo

let isUpdating = false;
let lastFetchedSong = '';  // Rastrear última canción para evitar fetch duplicado
const albumArtCache = {};  // Caché de carátulas: { 'artista - canción': url }
const defaultLogoUrl = './PUROLLANORADIO-COM-ICONO.png';

// Marquesina en la pestaña del navegador
let _tabMarqueeTimer = null;

function startTabMarquee(fullText) {
    // Limpiar marquesina anterior si existía
    if (_tabMarqueeTimer) {
        clearInterval(_tabMarqueeTimer);
        _tabMarqueeTimer = null;
    }

    const padded = fullText + '     ';  // espacio entre repeticiones
    let pos = 0;
    const visibleLen = 40; // caracteres visibles en la pestaña (aprox.)

    function step() {
        const slice = (padded + padded).substring(pos, pos + visibleLen);
        document.title = slice;
        pos = (pos + 1) % padded.length;
    }

    step();
    _tabMarqueeTimer = setInterval(step, 280);
}
window.startTabMarquee = startTabMarquee;

// Función para mostrar el toast "Ahora Suena"
function showAhoraSuenoToast(songName, artistName) {
    const toast = document.getElementById('ahoraSuenoToast');
    const toastSong = document.getElementById('ahoraSuenoSong');

    if (!toast || !toastSong) return;

    // Actualizar el texto
    toastSong.textContent = `${songName}${artistName ? ' - ' + artistName : ''}`;

    // Mostrar el toast
    toast.classList.remove('hide');
    toast.classList.add('show');

    // Ocultar después de 5 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
    }, 5000);
}

/**
 * Busca la carátula del álbum en iTunes Search API y actualiza la imagen central del vinilo.
 * Patrón: Single Responsibility — esta función solo gestiona la imagen del vinilo.
 * @param {string} songTitle - Título de la canción actual.
 * @param {string} artistName - Nombre del artista.
 */
async function fetchAlbumArt(songTitle, artistName) {
    const vinylImg = document.getElementById('vinylLabelImg');
    const vinylLabel = document.getElementById('vinylLabel');
    if (!vinylImg || !vinylLabel) return;

    const cacheKey = `${artistName} - ${songTitle}`.toLowerCase();

    // Si ya tenemos en caché, usar directamente
    if (albumArtCache[cacheKey] !== undefined) {
        applyAlbumArt(vinylImg, vinylLabel, albumArtCache[cacheKey]);
        return;
    }

    try {
        // Construir query de búsqueda: artista + canción para mayor precisión
        const query = encodeURIComponent(`${artistName} ${songTitle}`);
        const url = `https://itunes.apple.com/search?term=${query}&media=music&limit=1`;

        const response = await fetch(url, {
            cache: 'no-store',
            signal: AbortSignal.timeout(5000) // Timeout de 5s para no bloquear UX
        });

        if (!response.ok) throw new Error('iTunes API no disponible');

        const data = await response.json();

        if (data.resultCount > 0 && data.results[0].artworkUrl100) {
            // Obtener imagen en alta resolución (600x600 en lugar de 100x100)
            const artUrl = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
            albumArtCache[cacheKey] = artUrl;
            applyAlbumArt(vinylImg, vinylLabel, artUrl);
        } else {
            // Sin resultado: cachear como null para no reintentar
            albumArtCache[cacheKey] = null;
            applyAlbumArt(vinylImg, vinylLabel, null);
        }
    } catch (error) {
        console.warn('⚠️ No se pudo obtener carátula:', error.message);
        // En caso de error de red, no cachear para permitir reintento
        applyAlbumArt(vinylImg, vinylLabel, null);
    }
}

/**
 * Aplica la carátula al vinilo con transición suave.
 * @param {HTMLImageElement} imgEl - Elemento imagen del vinilo.
 * @param {HTMLElement} labelEl - Contenedor de la etiqueta del vinilo.
 * @param {string|null} artUrl - URL de la carátula o null para logo por defecto.
 */
function applyAlbumArt(imgEl, labelEl, artUrl) {
    const targetSrc = artUrl || defaultLogoUrl;

    // Evitar cambios innecesarios
    if (imgEl.src === targetSrc) return;

    // Transición: fade out -> swap -> fade in
    imgEl.style.opacity = '0';

    setTimeout(() => {
        imgEl.src = targetSrc;
        imgEl.alt = artUrl ? 'Carátula del tema actual' : 'Puro Llano Radio Logo';

        // Toggle class para ajustar estilos según si hay carátula o logo
        if (artUrl) {
            labelEl.classList.add('has-cover-art');
        } else {
            labelEl.classList.remove('has-cover-art');
        }

        // Fade in cuando la imagen cargue
        imgEl.onload = () => {
            imgEl.style.opacity = '1';
        };

        // Fallback si la imagen no carga (URL rota)
        imgEl.onerror = () => {
            imgEl.src = defaultLogoUrl;
            labelEl.classList.remove('has-cover-art');
            imgEl.style.opacity = '1';
        };
    }, 300); // 300ms = duración de la transición CSS
}

async function updateMetadata() {
    if (isUpdating) return;
    isUpdating = true;

    const titleEl = document.getElementById('song-title');
    const artistEl = document.getElementById('artist-name');
    const logoRadio = "./PUROLLANORADIO-COM-ICONO.png";

    try {
        const cacheBuster = Date.now();
        const apiUrl = 'https://radio.mipanel.stream:6816/stats?json=1';
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}&t=${cacheBuster}`;

        const res = await fetch(proxyUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error("Error en respuesta de red");

        const json = await res.json();
        const data = JSON.parse(json.contents);

        let [art, son] = (data.songtitle || "PURO LLANO - RADIO").split(' - ').map(s => s?.trim());
        if (!son) { son = art; art = "PURO LLANO RADIO"; }

        // Actualizar directamente sin transición de frases
        artistEl.innerText = art;
        titleEl.innerText = son;

        // Mostrar toast "Ahora Suena"
        showAhoraSuenoToast(son, art);

        // Buscar y mostrar carátula del tema en el vinilo
        const currentSongKey = `${art} - ${son}`;
        if (currentSongKey !== lastFetchedSong) {
            lastFetchedSong = currentSongKey;
            fetchAlbumArt(son, art);
        }

        // Agregar al historial
        if (typeof addToHistory === 'function') {
            addToHistory(son);
        }

        // Manejo de marquesina
        titleEl.classList.remove('marquee-active');
        void titleEl.offsetWidth; // Forzar reflow para reiniciar animación
        if (son.length > 30) {
            titleEl.classList.add('marquee-active');
        }

        // Actualizar MediaSession (Pantalla de bloqueo)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: son,
                artist: art,
                album: 'Puro Llano Radio',
                artwork: [{ src: logoRadio, sizes: '512x512', type: 'image/png' }]
            });
        }

        // Marquesina en la pestaña del navegador (scroll de derecha a izquierda)
        startTabMarquee(`🎵 ${son} - Puro Llano Radio`);

    } catch (e) {
        console.error("❌ Error en metadata:", e);
    } finally {
        isUpdating = false;
        // INTERVALO: 15 segundos para evitar bloqueos de proxy
        setTimeout(updateMetadata, 15000);
    }
}

// INICIO: Actualización de metadata
document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('song-title');
    const artistEl = document.getElementById('artist-name');

    // Limpiar caché antiguo de localStorage
    localStorage.removeItem('lastSong');
    localStorage.removeItem('lastArtist');

    // Mostrar mensaje inicial por defecto
    titleEl.innerText = "LISTO PARA ESCUCHAR";
    artistEl.innerText = "Joropo del bueno";

    // Iniciar actualización de metadata
    updateMetadata();
});

/* ==========================
   SEÑAL EN VIVO
========================== */
function actualizarEstadoSignal(online) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');

    if (online) {
        dot.className = 'dot-online';
        text.innerText = "EN VIVO";
        text.style.color = "#2ecc71";
    } else {
        dot.className = 'dot-offline';
        text.innerText = "DESCONECTADO";
        text.style.color = "#e74c3c";
    }
}

window.addEventListener('offline', () => {
    actualizarEstadoSignal(false);
});

window.addEventListener('online', () => {
    actualizarEstadoSignal(true);
});

audio.addEventListener('error', () => {
    actualizarEstadoSignal(false);
});

audio.addEventListener('playing', () => {
    actualizarEstadoSignal(true);
});

/* ==========================
   CONTADOR DE TIEMPO DE CONEXIÓN
========================== */

// Iniciar contador de tiempo
function startConnectionTimer() {
    connectionStartTime = Date.now();

    // Actualizar cada segundo
    if (connectionTimerInterval) {
        clearInterval(connectionTimerInterval);
    }

    connectionTimerInterval = setInterval(updateConnectionTimer, 1000);
    updateConnectionTimer(); // Actualización inmediata
}

// Detener contador de tiempo
function stopConnectionTimer() {
    if (connectionTimerInterval) {
        clearInterval(connectionTimerInterval);
        connectionTimerInterval = null;
    }
    connectionStartTime = null;

    // Resetear displays
    if (currentTimeEl) currentTimeEl.textContent = '00:00';
    if (progressBar) progressBar.style.width = '0%';
    if (progressCursor) progressCursor.style.left = '0%';
}

// Actualizar contador de tiempo
function updateConnectionTimer() {
    if (!connectionStartTime) return;

    const elapsed = Date.now() - connectionStartTime;
    const timeString = formatTime(elapsed);

    if (currentTimeEl) currentTimeEl.textContent = timeString;

    // Actualizar barra de progreso (simulada para streaming en vivo)
    // Usamos un ciclo de 24 horas para la barra
    const hoursInDay = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
    const progress = (elapsed % hoursInDay) / hoursInDay * 100;

    if (progressBar) progressBar.style.width = progress + '%';
    if (progressCursor) progressCursor.style.left = progress + '%';
}

// Formatear tiempo en HH:MM
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

