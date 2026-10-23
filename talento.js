/* ==========================================================================
   TALENTO LLANERO JS - LOGICA Y SEGURIDAD MÓDULO SOCIAL
   --------------------------------------------------------------------------
   Arquitectura: Event-Driven Frontend connectado a Firebase BaaS.
   Seguridad: Prevención XSS activa, Validaciones Regex de YouTube.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    // Referencias DOM
    const postForm = document.getElementById('postForm');
    const artistNameInput = document.getElementById('artistName');
    const postCategoryInput = document.getElementById('postCategory');
    const postImageInput = document.getElementById('postImage');
    const youtubeLinkInput = document.getElementById('youtubeLink');
    const postMessageInput = document.getElementById('postMessage');
    const charCountEl = document.getElementById('charCount');
    const charLimitEl = document.getElementById('charLimit');
    const submitBtn = document.getElementById('submitBtn');
    const formStatus = document.getElementById('formStatus');
    const postsContainer = document.getElementById('postsContainer');
    const loadingFeed = document.getElementById('loadingFeed');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreviewImg = document.getElementById('imagePreviewImg');
    const removePreviewBtn = document.getElementById('removePreviewBtn');
    const contactWhatsappInput = document.getElementById('contactWhatsapp');
    const floatingCTA = document.getElementById('floatingCTA');
    const toastContainer = document.getElementById('toast-container');

    // Estado Local de "Me Gusta" (persistencia por localStorage)
    const localLikes = JSON.parse(localStorage.getItem('talento_likes') || '{}');

    // Estado Global para la UI de comentarios (Persistir secciones abiertas entre refrescos automáticos de Firebase)
    window.openedCommentSections = window.openedCommentSections || new Set();

    // ==============================================
    // 🛡️ SEGURIDAD & UTILIDADES (Clean Code)
    // ==============================================

    // ==============================================
    // 🛡️ MODERADOR DE CONTENIDO (Profanity Filter)
    // ==============================================
    const badWordsList = [
        'puta', 'puto', 'mierda', 'coño', 'marico', 'marica', 'huevon', 'guevon', 'webón', 'webon',
        'verga', 'maldito', 'maldita', 'mamaguevo', 'mamagwebo', 'mamaguebo', 'coñazo', 'pendejo', 
        'pendeja', 'cabron', 'zorra', 'perra', 'malparido', 'hijo de puta', 'hijueputa', 'culo', 'boludo'
    ];

    /**
     * Reemplaza las malas palabras por asteriscos en la misma longitud.
     * Utiliza fronteras de palabra (\b) para no dañar palabras como "computadora", "reputación", etc.
     */
    function censorText(text) {
        if(!text) return text;
        const regex = new RegExp('\\b(' + badWordsList.join('|') + ')\\b', 'gi');
        return text.replace(regex, match => '*'.repeat(match.length));
    }

    /**
     * Devuelve true si encuentra alguna mala palabra (Para bloqueos estrictos de Nombres)
     */
    function containsProfanity(text) {
        if(!text) return false;
        const regex = new RegExp('\\b(' + badWordsList.join('|') + ')\\b', 'gi');
        return regex.test(text);
    }

    /**
     * Previene XSS sanitizando texto para renderizar en HTML
     */
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    /**
     * Helper UI de Compresión: Reduce el tamaño de imagen a Base64 ligero ~60KB
     */
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 700; 
                    const MAX_HEIGHT = 700;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6)); // 60% calidad optima
                };
                img.onerror = e => reject(e);
            };
            reader.onerror = e => reject(e);
        });
    }

    function extractYouTubeID(url) {
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    /**
     * Formateador de tiempo humano amigable. Ej: "hace 5 minutos"
     */
    function timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " años";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " meses";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " días";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " horas";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutos";
        return "hace un momento";
    }

    // ==============================================
    // UTILS: Compartir en Redes Sociales (Web Share API)
    // ==============================================
    window.sharePostURL = async function(artistName) {
        const urlToShare = window.location.href; 
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Puro Llano Radio - ${artistName}`,
                    text: `🔥 Escucha el increíble talento de ${artistName} en la tarima virtual de Puro Llano Radio. ¡Apóyalo aquí! 🤠👇`,
                    url: urlToShare
                });
            } catch (err) { console.log('Cancelado o no soportado.', err); }
        } else {
            alert(`Comparte este enlace con tus amigos:\n\n${urlToShare}`);
        }
    };
    
    // ==============================================
    // TOAST NOTIFICATIONS SYSTEM
    // ==============================================
    window.showToast = function(message, icon = "fa-bell") {
        if(!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `<i class="fa ${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 400); // Esperar que termine transition
        }, 4000);
    };

    // Listen Scroll to toggle Floating CTA
    window.addEventListener('scroll', () => {
        if(window.scrollY > 400) {
            floatingCTA.style.opacity = '1';
            floatingCTA.style.pointerEvents = 'auto';
        } else {
            floatingCTA.style.opacity = '0';
            floatingCTA.style.pointerEvents = 'none';
        }
    });

    // ==============================================
    // UTILS: Integración YouTube Data API v3
    // ==============================================
    const YOUTUBE_API_KEY = "AIzaSyAriF5nR5DTZT6bXT5jK1A6sEpNRLV3emc";

    function formatYTNumber(num) {
        if (!num) return '0';
        const n = parseInt(num);
        if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
        return n.toLocaleString();
    }

    async function fetchYouTubeStats(videoId) {
        const cacheKey = `yt_stats_${videoId}`;
        if (sessionStorage.getItem(cacheKey)) {
            return JSON.parse(sessionStorage.getItem(cacheKey));
        }
        
        try {
            const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`);
            const videoData = await videoRes.json();
            
            if (!videoData.items || videoData.items.length === 0) return null;
            
            const viewsCount = videoData.items[0].statistics.viewCount;
            const publishDate = videoData.items[0].snippet.publishedAt;
            const channelId = videoData.items[0].snippet.channelId;
            
            const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`);
            const channelData = await channelRes.json();
            
            const subCount = channelData.items && channelData.items.length > 0 ? channelData.items[0].statistics.subscriberCount : 0;
            
            const stats = { views: viewsCount, subs: subCount, date: publishDate };
            sessionStorage.setItem(cacheKey, JSON.stringify(stats));
            return stats;
        } catch (e) {
            console.error("YouTube API Error:", e);
            return null;
        }
    }

    // ==============================================
    // LOGICA DE COMENTARIOS (Global para acceso desde HTML dinámico)
    // ==============================================
    window.toggleComments = function(postId) {
        const section = document.getElementById(`comments-${postId}`);
        if (!section) return;
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            window.openedCommentSections.add(postId);
        } else {
            section.style.display = 'none';
            window.openedCommentSections.delete(postId);
        }
    };

    window.addComment = async function(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        if (!input || !input.value.trim()) return;

        let text = input.value.trim();

        // 🛡️ Filtro de Groserías en Comentarios (Rechazo Inmediato)
        if (containsProfanity(text)) {
            alert("⚠️ El comentario contiene lenguaje inapropiado y viola nuestras normas de comunidad. Por favor corrígelo.");
            return;
        }

        const postRef = db.ref(`talento_posts/${postId}/comments`);

        try {
            await postRef.push({
                name: 'Oyente Puro Llano',
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            input.value = '';
        } catch (e) {
            console.error("Error al comentar:", e);
            alert("No se pudo enviar el comentario. Revisa tu conexión.");
        }
    };

    // ==============================================
    // FIREBASE INITIALIZATION & DB REFERENCE
    // ==============================================
    let db;
    try {
        db = firebase.database();
    } catch (e) {
        console.error("Firebase no disponible. Error de infraestructura.", e);
        showStatus("Error conectando con los servidores llaneros.", "error");
        return;
    }

    const postsRef = db.ref('talento_posts');

    // ==============================================
    // UI EVENT LISTENERS
    // ==============================================

    // Cambio dinámico de límites según Categoría
    postCategoryInput.addEventListener('change', (e) => {
        if (e.target.value === 'Biografía / Historia') {
            postMessageInput.setAttribute('maxlength', '3000');
            if (charLimitEl) charLimitEl.textContent = '/3000';
            postMessageInput.placeholder = "Breve biografía, trayectoria de años, reconocimientos, discografía, y lugar de origen...";
            postMessageInput.rows = 8;
        } else {
            postMessageInput.setAttribute('maxlength', '350');
            if (charLimitEl) charLimitEl.textContent = '/350';
            postMessageInput.placeholder = "¡Saludos familia llanera! Aquí les dejo mi...";
            postMessageInput.rows = 4;
        }
        postMessageInput.dispatchEvent(new Event('input'));
    });

    // Contador de caracteres dinámico
    postMessageInput.addEventListener('input', (e) => {
        const len = e.target.value.length;
        const currentLimit = parseInt(postMessageInput.getAttribute('maxlength') || 350);
        charCountEl.textContent = len;
        if (len >= currentLimit) { charCountEl.style.color = '#ff4444'; } 
        else { charCountEl.style.color = 'var(--text-muted)'; }
    });

    // Previsualización de Imagen
    postImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreviewImg.src = event.target.result;
                imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    removePreviewBtn.addEventListener('click', () => {
        postImageInput.value = '';
        imagePreviewContainer.style.display = 'none';
        imagePreviewImg.src = '';
    });

    // Envío del Formulario
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let artist = artistNameInput.value.trim();
        const category = postCategoryInput.value;
        const url = youtubeLinkInput.value.trim();
        let msg = postMessageInput.value.trim();
        const whatsappRaw = contactWhatsappInput ? contactWhatsappInput.value.trim() : '';
        const whatsappClean = whatsappRaw.replace(/[\s\-\(\)]/g, ''); // Limpiar para enlace directo wa.me
        
        // 🛡️ Validación estricta
        if (artist.length < 2 || msg.length < 5) {
            showStatus("Datos incompletos. Llena campos de texto al menos.", "error");
            return;
        }

        // 🛡️ Filtro de Modales (Evitar vulgaridades)
        if (containsProfanity(artist)) {
            showStatus("⚠️ Tu nombre artístico contiene palabras inapropiadas.", "error");
            return;
        }
        
        // Si el mensaje tiene groserías, somos nobles y las censuramos silenciosamente para no frustrar un post largo.
        msg = censorText(msg);

        const ytID = url ? extractYouTubeID(url) : null;
        if (url && !ytID) {
            showStatus("Enlace de YouTube inválido. Bórralo o corrígelo.", "error");
            return;
        }

        // Deshabilitar UI durante transacción
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Procesando...';

        // Compresión de imagen on-the-fly
        let base64Image = null;
        if (postImageInput.files && postImageInput.files.length > 0) {
            const file = postImageInput.files[0];
            if (file.size > 2.5 * 1024 * 1024) {
               showStatus("La portada debe pesar menos de 2MB.", "error");
               submitBtn.disabled = false;
               submitBtn.innerHTML = 'Publicar al Mundo <i class="fa fa-paper-plane"></i>';
               return;
            }
            try {
                base64Image = await compressImage(file);
            } catch(e) {
                showStatus("Error procesando imagen.", "error");
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Publicar al Mundo <i class="fa fa-paper-plane"></i>';
                return;
            }
        }

        try {
            // Modelo de datos a enviar
            const newPost = {
                artist: artist, // Será escapado al momento de renderizar
                category: category,
                message: msg,
                youtubeId: ytID || null,
                whatsapp: whatsappClean || null,
                imageBundle: base64Image || null,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                likes: 0
            };

            await postsRef.push(newPost);
            
            // Limpieza y Éxito
            postForm.reset();
            imagePreviewContainer.style.display = 'none';
            charCountEl.textContent = "0";
            
            // Efecto WOW en Formulario
            postForm.parentElement.style.boxShadow = "0 0 40px rgba(46, 213, 115, 0.4)";
            postForm.parentElement.style.borderColor = "var(--success)";
            setTimeout(() => {
                postForm.parentElement.style.boxShadow = "";
                postForm.parentElement.style.borderColor = "";
            }, 1500);

            showStatus("¡Publicación exitosa! Tu talento ya está online. 🚀", "success");
            
        } catch (error) {
            console.error("Error al publicar:", error);
            // Mostrar el error exacto para ayudar al debug (ej. "PERMISSION_DENIED")
            showStatus("Error: " + (error.message || "Fallo al conectar con el servidor."), "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Publicar al Mundo <i class="fa fa-rocket" style="margin-left:5px;"></i>';
        }
    });

    function showStatus(text, type) {
        formStatus.textContent = text;
        formStatus.className = `form-status status-${type}`;
        setTimeout(() => { formStatus.textContent = ''; }, 4000);
    }

    // ==============================================
    // LECTURA REACTIVA EN TIEMPO REAL (Firebase)
    // ==============================================
    
    // Obtenemos los últimos 50 posts ordenados por fecha
    postsRef.orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        // Remover estado de carga inicial
        if (loadingFeed) loadingFeed.style.display = 'none';
        
        postsContainer.innerHTML = ''; // Limpiar UI (DOM Rebuild)
        
        if (!snapshot.exists()) {
            postsContainer.innerHTML = `
                <div class="loading-state" style="opacity:0.6; color:#fff;">
                    <i class="fa fa-music fa-2x" style="margin-bottom:10px; display:block"></i>
                    Aún no hay artistas promocionados.<br>¡Sé el primero en mostrar tu talento!
                </div>`;
            return;
        }

        // Renderizado separado: Biografías (Carrusel) vs Posts Generales (Feed)
        const postsArray = [];
        const biosArray = [];
        
        snapshot.forEach((childSnapshot) => {
            const data = { id: childSnapshot.key, ...childSnapshot.val() };
            if (data.category === 'Biografía / Historia') {
                biosArray.unshift(data);
            } else {
                postsArray.unshift(data);
            }
        });

        // 1. DIBUJAR CARRUSEL DE BIOGRAFÍAS
        const biosSection = document.getElementById('biosSection');
        const biosCarousel = document.getElementById('biosCarousel');
        
        if (biosArray.length > 0) {
            if (biosSection) biosSection.style.display = 'block';
            if (biosCarousel) {
                biosCarousel.innerHTML = '';
                biosArray.forEach(bio => biosCarousel.appendChild(createBioCard(bio)));
            }
        } else {
            if (biosSection) biosSection.style.display = 'none';
        }

        // 2. DIBUJAR FEED GENERAL
        if (postsArray.length === 0) {
             postsContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#aaa;">Aún no hay lanzamientos musicales recientes.</div>`;
        } else {
             postsArray.forEach(post => renderPost(post));
        }

    }, (error) => {
        console.error("Error fetching data:", error);
        if(loadingFeed) loadingFeed.innerHTML = `<i class="fa fa-exclamation-circle"></i> Error leyendo publicaciones: ${error.message || error.code || 'Desconocido'}.<br><small style="font-size:0.7em">Asegúrate de haber guardado las reglas de base de datos.</small>`;
    });

    // Tracking para Nuevas Publicaciones Reales (Notificaciones)
    let initialLoadComplete = false;
    setTimeout(() => { initialLoadComplete = true; }, 3000); // Evitar alertas masivas al iniciar página

    postsRef.orderByChild('timestamp').limitToLast(1).on('child_added', (snapshot) => {
        if (!initialLoadComplete) return; 
        const post = snapshot.val();
        if(post && post.artist) {
            window.showToast(`¡${escapeHTML(post.artist)} acaba de subir a la tarima! 🎤`, 'fa-star');
        }
    });

    // ==============================================
    // GENERADOR DE VISTAS (DOM Injection)
    // ==============================================
    
    function renderPost(post) {
        // Sanitización rigurosa de los String para evitar inyección Scripts
        const safeArtist = escapeHTML(post.artist || 'Desconocido');
        const safeMsg = escapeHTML(post.message || '').replace(/\n/g, '<br>');
        // youtubeId ya fue extraído por regex, es seguro un hash alfanumérico
        const safeYtID = post.youtubeId;
        const initial = safeArtist.charAt(0).toUpperCase();

        const isLiked = localLikes[post.id] === true;

        if (!safeYtID && !post.imageBundle && !post.message) { return; } // Ignorar posts muertos

        const safeCategory = post.category ? escapeHTML(post.category) : 'Promoción Musical';
        
        // --- Procesamiento de Comentarios ---
        const commentsObj = post.comments || {};
        const commentsArray = Object.values(commentsObj).sort((a,b)=>a.timestamp-b.timestamp);
        const commentsCount = commentsArray.length;
        let commentsHTML = '';
        commentsArray.forEach(c => {
            const timeStr = timeAgo(c.timestamp);
            commentsHTML += `<div style="margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;">
                <strong style="color:var(--primary); font-size:0.8rem;">${escapeHTML(c.name || 'Oyente')}</strong> <span style="font-size:0.65rem; color:#aaa;">${timeStr}</span><br>
                <span style="color:#ddd; font-size:0.9rem;">${escapeHTML(c.text)}</span>
            </div>`;
        });
        const isCommentsOpen = window.openedCommentSections && window.openedCommentSections.has(post.id);
        
        // Badge elegante para la categoría
        const categoryBadge = `<div style="display:inline-block; margin-bottom:8px; background:rgba(254, 210, 2, 0.1); color:#fed202; padding:4px 12px; border-radius:15px; font-size:0.75rem; font-weight:700; border:1px solid rgba(254,210,2,0.3); text-transform:uppercase; letter-spacing:1px;"><i class="fa fa-tag"></i> ${safeCategory}</div>`;

        // Arte Promocional (Si subieron flyer)
        const uploadedImageNode = post.imageBundle 
            ? `<div style="margin-top:15px; border-radius:12px; overflow:hidden; border:1px solid rgba(254,210,2,0.2); background:#000;"><img src="${post.imageBundle}" alt="Arte promocional" style="width:100%; max-height:450px; object-fit:contain; display:block;"></div>` 
            : '';

        // Player de YouTube (Si enviaron link)
        const ytNode = (safeYtID && safeYtID.length === 11)
            ? `<div class="yt-preview-card" style="display:flex; align-items:center; gap:20px; background:rgba(255,255,255,0.05); padding:15px; border-radius:12px; border:1px solid rgba(254,210,2,0.2); margin-top:15px; transition: transform 0.3s ease;">
                    <div style="width:120px; height:80px; flex-shrink:0; overflow:hidden; border-radius:8px; border:2px solid #fed202;">
                        <img src="https://img.youtube.com/vi/${safeYtID}/mqdefault.jpg" alt="Video cover" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div>
                        <h4 style="color:#fed202; margin-bottom:8px; font-size:1rem;">${safeArtist}</h4>
                        <a href="https://www.youtube.com/watch?v=${safeYtID}" target="_blank" style="display:inline-flex; align-items:center; gap:8px; padding:8px 16px; background:linear-gradient(135deg, #FF0000 0%, #cc0000 100%); color:#fff; border-radius:20px; text-decoration:none; font-size:0.8rem; font-weight:700;">
                            <i class="fa-brands fa-youtube"></i> Ver en YouTube
                        </a>
                    </div>
                </div>`
            : '';

        // Estructura del Nodo principal
        const article = document.createElement('article');
        article.className = 'post-card';
        article.setAttribute('data-id', post.id);

        article.innerHTML = `
            <div class="post-header">
                <div class="artist-avatar">${initial}</div>
                <div class="artist-meta">
                    <div class="post-artist-name">${safeArtist}</div>
                    <div class="post-date"><i class="fa fa-clock"></i> ${timeAgo(post.timestamp)}</div>
                </div>
            </div>
            
            <div class="post-body">
                ${categoryBadge}
                <div class="post-message" style="margin-top: 5px;">${safeMsg}</div>
                ${uploadedImageNode}
                ${ytNode}
                <div id="yt-stats-${post.id}" style="display:none; flex-wrap:wrap; font-size:0.75rem; color:#fff; margin-top:15px; padding:12px; background:rgba(0,0,0,0.5); border:1px solid rgba(254,210,2,0.1); border-radius:10px; justify-content:space-evenly; gap:10px; border-left:3px solid var(--primary);"></div>
            </div>

            <div class="post-footer" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; align-items:center;">
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn-like ${isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                        <i class="fa fa-hands-clapping"></i> <span>${post.likes || 0}</span> Aplausos
                    </button>
                    <button class="btn-comment" onclick="window.toggleComments('${post.id}')">
                        <i class="fa fa-comment"></i> ${commentsCount}
                    </button>
                    ${post.whatsapp ? `<a href="https://wa.me/${post.whatsapp.replace(/\D/g,'')}?text=Hola%20${encodeURIComponent(safeArtist)},%20te%20vi%20en%20Puro%20Llano%20Radio%20y%20me%20gustar%C3%ADa%20contratarte." target="_blank" class="btn-whatsapp"><i class="fa-brands fa-whatsapp"></i> Contratar</a>` : ''}
                </div>
                <button class="btn-share" onclick="sharePostURL('${safeArtist.replace(/'/g, "\\'")}')">
                    <i class="fa fa-share-nodes"></i> Compartir
                </button>
            </div>
            
            <div class="comments-section" id="comments-${post.id}" style="display:${isCommentsOpen ? 'block' : 'none'}; padding:15px; border-top:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.2);">
               <div class="comments-list" id="comments-list-${post.id}" style="max-height:150px; overflow-y:auto; font-size:0.85rem; margin-bottom:10px; scrollbar-width:thin;">
                   ${commentsHTML || '<div style="color:#aaa; font-style:italic;">Se el primero en comentar...</div>'}
               </div>
               <div style="display:flex; gap:10px; align-items:center;">
                  <input type="text" id="comment-input-${post.id}" placeholder="Escribe un comentario o un saludo..." style="flex:1; width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(254,210,2,0.3); color:#fff; border-radius:20px; padding:8px 15px; font-size:0.85rem; outline:none;" onkeypress="if(event.key === 'Enter') addComment('${post.id}')">
                  <button onclick="window.addComment('${post.id}')" style="background:var(--primary); color:var(--dark-deep); border:none; padding:8px 15px; border-radius:20px; cursor:pointer;"><i class="fa fa-paper-plane"></i></button>
               </div>
            </div>
        `;

        postsContainer.appendChild(article);

        // YouTube API Stats Fetcher
        if (safeYtID && safeYtID.length === 11) {
            fetchYouTubeStats(safeYtID).then(stats => {
                if(stats) {
                    const statsDiv = document.getElementById(`yt-stats-${post.id}`);
                    if(statsDiv) {
                        statsDiv.style.display = 'flex';
                        const pDate = new Date(stats.date);
                        statsDiv.innerHTML = `
                            <span style="display:flex; align-items:center; gap:5px;" title="Reproducciones Diarias"><i class="fa fa-eye" style="color:var(--primary);"></i> <b>${formatYTNumber(stats.views)}</b> Vistas</span>
                            <span style="display:flex; align-items:center; gap:5px;" title="Seguidores del Canal"><i class="fa fa-users" style="color:var(--primary);"></i> <b>${formatYTNumber(stats.subs)}</b> Subs</span>
                            <span style="display:flex; align-items:center; gap:5px;" title="Fecha de Estreno"><i class="fa fa-calendar-alt" style="color:var(--primary);"></i> Estreno: <b>${pDate.toLocaleDateString('es-VE')}</b></span>
                        `;
                    }
                }
            });
        }
    }

    // Generador de Tarjeta de Carrusel Biográfico
    function createBioCard(post) {
        const safeArtist = escapeHTML(post.artist || 'Desconocido');
        const safeMsg = escapeHTML(post.message || '').replace(/\n/g, '<br>');
        const isLiked = localLikes[post.id] === true;
        
        // --- Procesamiento de Comentarios ---
        const commentsObj = post.comments || {};
        const commentsArray = Object.values(commentsObj).sort((a,b)=>a.timestamp-b.timestamp);
        const commentsCount = commentsArray.length;
        let commentsHTML = '';
        commentsArray.forEach(c => {
            const timeStr = timeAgo(c.timestamp);
            commentsHTML += `<div style="margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:5px;">
                <strong style="color:var(--primary); font-size:0.8rem;">${escapeHTML(c.name || 'Oyente')}</strong> <span style="font-size:0.65rem; color:#aaa;">${timeStr}</span><br>
                <span style="color:#ddd; font-size:0.9rem;">${escapeHTML(c.text)}</span>
            </div>`;
        });
        const isCommentsOpen = window.openedCommentSections && window.openedCommentSections.has(post.id);
        
        const card = document.createElement('article');
        card.className = 'bio-card';
        card.setAttribute('data-id', post.id);

        let imageHTML = '';
        if (post.imageBundle) {
            imageHTML = `<img src="${post.imageBundle}" class="bio-card-img" alt="${safeArtist}">`;
        } else if (post.youtubeId && post.youtubeId.length === 11) {
            imageHTML = `<img src="https://img.youtube.com/vi/${post.youtubeId}/hqdefault.jpg" class="bio-card-img" alt="${safeArtist}">`;
        } else {
            imageHTML = `<div class="bio-card-img" style="background:linear-gradient(135deg,rgba(254,210,2,0.5),rgba(0,0,0,0.8)); display:flex; align-items:center; justify-content:center; color:#fff; font-size:4rem;">${safeArtist.charAt(0)}</div>`;
        }

        card.innerHTML = `
            ${imageHTML}
            <div class="bio-card-content">
                <h3>${safeArtist}</h3>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px;"><i class="fa fa-clock"></i> ${timeAgo(post.timestamp)}</div>
                <div class="bio-text-scroll">
                    <p>${safeMsg}</p>
                </div>
            </div>
            <div class="post-footer" style="border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; align-items:center; background:rgba(0,0,0,0.3); padding:15px;">
                <div style="display:flex; gap:10px; flex-wrap:wrap; flex:1;">
                    <button class="btn-like ${isLiked ? 'liked' : ''}" data-post-id="${post.id}" style="flex:1;">
                        <i class="fa fa-hands-clapping"></i> <span>${post.likes || 0}</span>
                    </button>
                    <button class="btn-comment" onclick="window.toggleComments('${post.id}')" style="flex:1;">
                        <i class="fa fa-comment"></i> ${commentsCount}
                    </button>
                </div>
                <button class="btn-share" onclick="sharePostURL('${safeArtist.replace(/'/g, "\\'")}')" style="flex:1;">
                    <i class="fa fa-share-nodes"></i> Compartir
                </button>
            </div>
            
            <div class="comments-section" id="comments-${post.id}" style="display:${isCommentsOpen ? 'block' : 'none'}; padding:15px; border-top:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.2);">
               <div class="comments-list" id="comments-list-${post.id}" style="max-height:150px; overflow-y:auto; font-size:0.85rem; margin-bottom:10px; scrollbar-width:thin;">
                   ${commentsHTML || '<div style="color:#aaa; font-style:italic;">Se el primero en comentar...</div>'}
               </div>
               <div style="display:flex; gap:10px; align-items:center;">
                  <input type="text" id="comment-input-${post.id}" placeholder="Escribe un saludo..." style="flex:1; width:100%; background:rgba(0,0,0,0.4); border:1px solid rgba(254,210,2,0.3); color:#fff; border-radius:20px; padding:8px 15px; font-size:0.85rem; outline:none;" onkeypress="if(event.key === 'Enter') addComment('${post.id}')">
                  <button onclick="window.addComment('${post.id}')" style="background:var(--primary); color:var(--dark-deep); border:none; padding:8px 15px; border-radius:20px; cursor:pointer;"><i class="fa fa-paper-plane"></i></button>
               </div>
            </div>
        `;
        return card;
    }

    // ==============================================
    // EVENT DELEGATION (Lógica de los Aplausos/Likes)
    // ==============================================
    
    postsContainer.addEventListener('click', async (e) => {
        const likeBtn = e.target.closest('.btn-like');
        if (!likeBtn) return;

        const postId = likeBtn.getAttribute('data-post-id');
        const postRef = db.ref(`talento_posts/${postId}/likes`);

        try {
            if (!localLikes[postId]) {
                // Dar Like
                await postRef.transaction((currentLikes) => {
                    return (currentLikes || 0) + 1;
                });
                localLikes[postId] = true;
            } else {
                // Quitar Like
                await postRef.transaction((currentLikes) => {
                    return (currentLikes || 0) - 1;
                });
                delete localLikes[postId];
            }
            
            // Persistir localmente
            localStorage.setItem('talento_likes', JSON.stringify(localLikes));

        } catch (error) {
            console.error("Transacción de like falló", error);
        }

        // --- EFECTO VISUAL DE APLAUSO (WOW) ---
        if (!localLikes[postId]) return; // Solo si dio like
        
        const applauseEffect = document.createElement('div');
        applauseEffect.innerHTML = '👏';
        applauseEffect.style.cssText = `
            position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
            font-size: 2rem; pointer-events: none; opacity: 1; z-index: 100;
            animation: floatUpClap 0.8s ease-out forwards;
        `;
        likeBtn.style.position = 'relative';
        likeBtn.appendChild(applauseEffect);
        setTimeout(() => applauseEffect.remove(), 800);
    });

});
