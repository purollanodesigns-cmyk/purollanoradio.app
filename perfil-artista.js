/* ==========================================================================
   PERFIL ARTISTA JS - LÓGICA DEL FORMULARIO Y MÓDULO IA
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    const perfilForm = document.getElementById('perfilArtistaForm');
    const formStatus = document.getElementById('formStatus');
    const btnGenerarBioIA = document.getElementById('btnGenerarBioIA');
    const bioIAPanel = document.getElementById('bioIAPanel');
    const bioAIResult = document.getElementById('bioAIResult');
    const userAvatar = document.getElementById('userAvatar');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userInfo = document.getElementById('userInfo');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    let db;
    let auth;
    let currentUser = null;
    let generatedBioText = '';

    try {
        auth = firebase.auth();
        db = firebase.database();
    } catch(e) {
        console.error('Firebase no disponible:', e);
        showStatus('Error conectando con el servidor', 'error');
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (userInfo) userInfo.classList.add('show');
            
            const displayName = user.displayName || user.email.split('@')[0];
            if (userNameDisplay) userNameDisplay.textContent = displayName;
            if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();
            
            await loadExistingProfile(user.uid);
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (userInfo) userInfo.classList.remove('show');
        }
    });

    async function loadExistingProfile(uid) {
        try {
            const snapshot = await db.ref('perfiles/' + uid).once('value');
            const perfil = snapshot.val();
            
            if (perfil) {
                document.getElementById('nombreArtistico').value = perfil.nombreArtistico || '';
                document.getElementById('nombreReal').value = perfil.nombreReal || '';
                document.getElementById('region').value = perfil.region || '';
                document.getElementById('whatsapp').value = perfil.whatsapp || '';
                document.getElementById('biografia').value = perfil.biografia || '';
                document.getElementById('youtube').value = perfil.youtube || '';
                document.getElementById('spotify').value = perfil.spotify || '';
                document.getElementById('instagram').value = perfil.instagram || '';
                document.getElementById('facebook').value = perfil.facebook || '';
                document.getElementById('videoIntro').value = perfil.videoIntro || '';
                
                if (perfil.instrumentos && Array.isArray(perfil.instrumentos)) {
                    document.querySelectorAll('input[name="instrumento"]').forEach(cb => {
                        cb.checked = perfil.instrumentos.includes(cb.value);
                    });
                }
                
                if (perfil.generos && Array.isArray(perfil.generos)) {
                    document.querySelectorAll('input[name="genero"]').forEach(cb => {
                        cb.checked = perfil.generos.includes(cb.value);
                    });
                }
                
                window.showToast('Perfil cargado correctamente', 'fa-check');
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
        }
    }

    if (perfilForm) {
        perfilForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentUser) {
                window.openAuthModal('register');
                showStatus('Debes iniciar sesión para guardar tu perfil', 'error');
                return;
            }
            
            const nombreArtistico = document.getElementById('nombreArtistico').value.trim();
            const region = document.getElementById('region').value;
            
            if (!nombreArtistico || !region) {
                showStatus('Por favor completa los campos obligatorios', 'error');
                return;
            }
            
            const instrumentos = Array.from(document.querySelectorAll('input[name="instrumento"]:checked')).map(cb => cb.value);
            const generos = Array.from(document.querySelectorAll('input[name="genero"]:checked')).map(cb => cb.value);
            
            const perfilData = {
                uid: currentUser.uid,
                nombreArtistico: nombreArtistico,
                nombreReal: document.getElementById('nombreReal').value.trim(),
                region: region,
                whatsapp: document.getElementById('whatsapp').value.trim(),
                biografia: document.getElementById('biografia').value.trim(),
                instrumentos: instrumentos,
                generos: generos,
                youtube: document.getElementById('youtube').value.trim(),
                spotify: document.getElementById('spotify').value.trim(),
                instagram: document.getElementById('instagram').value.trim(),
                facebook: document.getElementById('facebook').value.trim(),
                videoIntro: document.getElementById('videoIntro').value.trim(),
                fechaActualizacion: firebase.database.ServerValue.TIMESTAMP,
                perfilCompleto: true
            };
            
            const submitBtn = perfilForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Guardando...';
            
            try {
                await db.ref('perfiles/' + currentUser.uid).set(perfilData);
                
                const userRef = db.ref('usuarios/' + currentUser.uid);
                await userRef.update({
                    tienePerfil: true,
                    nombreArtistico: nombreArtistico
                });
                
                showStatus('¡Perfil guardado exitosamente! 🎸', 'success');
                window.showToast('Tu perfil está ahora disponible para el mundo', 'fa-star');
                
            } catch (error) {
                console.error('Error guardando perfil:', error);
                showStatus('Error al guardar: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    function showStatus(text, type) {
        if (formStatus) {
            formStatus.textContent = text;
            formStatus.className = 'form-status status-' + type;
            setTimeout(() => { 
                formStatus.textContent = ''; 
                formStatus.className = 'form-status';
            }, 5000);
        }
    }

    window.generateBioAI = async function() {
        const nombreArtistico = document.getElementById('nombreArtistico').value.trim();
        const region = document.getElementById('region').value;
        const instrumentos = Array.from(document.querySelectorAll('input[name="instrumento"]:checked')).map(cb => cb.value);
        
        if (!nombreArtistico) {
            window.showToast('Ingresa tu nombre artístico primero', 'fa-exclamation');
            return;
        }
        
        const btnOriginalText = btnGenerarBioIA.innerHTML;
        btnGenerarBioIA.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generando...';
        btnGenerarBioIA.disabled = true;
        
        if (bioIAPanel) bioIAPanel.style.display = 'block';
        if (bioAIResult) bioAIResult.innerHTML = '<div class="loading-spinner"></div> Generando biografía...';
        
        try {
            const bioText = await generarBiografiaInteligente({
                nombreArtistico: nombreArtistico,
                region: region,
                instrumentos: instrumentos
            });
            
            generatedBioText = bioText;
            if (bioAIResult) bioAIResult.innerHTML = bioText;
            window.showToast('¡Biografía generada! Revísala y úsala', 'fa-magic');
            
        } catch (error) {
            console.error('Error generando bio:', error);
            if (bioAIResult) bioAIResult.innerHTML = 'Error al generar biografía. Intenta de nuevo.';
        } finally {
            btnGenerarBioIA.innerHTML = btnOriginalText;
            btnGenerarBioIA.disabled = false;
        }
    };

    async function generarBiografiaInteligente(datos) {
        const templates = [
            `${datos.nombreArtistico} es un destacado exponente de la música llanera, nacido en las tierras de ${datos.region || 'los llanos'}. Con su talento y pasión por el folklore, ha logrado conquistarle el corazón a miles de seguidores en Venezuela y Colombia.
            
Su dominio del ${datos.instrumentos?.[0] || 'tres'} llanero le ha permitido abrirse paso en los escenarios más prestigiosos del género, manteniendo viva la tradición musical que identifica a nuestra cultura llanera.

${datos.nombreArtistico} representa la esencia del joropo y la tonada llanera, llevando consigo el legado de los grandes maestros del pasado mientras aporta su propio estilo y personalidad a cada interpretación.`,

            `Nacido en ${datos.region || 'el llano'}, ${datos.nombreArtistico} ha dedicado su vida a preservar y promover las tradiciones musicales de los llanos venezolanos y colombianos. Su trayectoria artística está marcada por una profunda devotion al folklore llanero.

Con más de experiencia interpretando ${datos.instrumentos?.join(', ') || 'los instrumentos típicos llaneros'}, este artista ha participado en los festivales más importantes de la región, deleitando al público con su talento único.

"Donde haya un llanero, allí suena el alma del llano" – Esta frase resume perfectamente la filosofía musical de ${datos.nombreArtistico}, quien continúa llevando el nombre de nuestra tierra a cada escenario donde se presenta.`,

            `${datos.nombreArtistico} emerge como una de las voces más prometedoras del nuevo movimiento musical llanero. Proveniente de ${datos.region || 'las vastas tierras llaneras'}, este artista combina la tradición con un toque contemporáneo que atrae tanto a jóvenes como a nostálgicos del genre.

Su habilidad con el ${datos.instrumentos?.[0] || 'cuatro'} y su vozronca han sido reconocidas en diversos certámenes y festivales de música llanera, consolidándolo como una figura en ascenso en el panorama musical del folklore llanero.

La música de ${datos.nombreArtistico} no solo entretiene, sino que también preserva las historias y tradiciones de nuestros ancestros, llevando el mensaje de identidad y orgullo llanero a cada rincón donde llega su melodía.`
        ];
        
        return templates[Math.floor(Math.random() * templates.length)];
    }

    window.copyAIResult = function(elementId) {
        const text = document.getElementById(elementId).innerText;
        navigator.clipboard.writeText(text).then(() => {
            window.showToast('Texto copiado al portapapeles', 'fa-copy');
        }).catch(err => {
            console.error('Error copiando:', err);
        });
    };

    window.useBioAI = function() {
        if (generatedBioText) {
            const bioTextarea = document.getElementById('biografia');
            if (bioTextarea) {
                bioTextarea.value = generatedBioText;
                window.showToast('¡Biografía aplicada! Ahora puedes editarla', 'fa-check');
            }
        }
    };

    window.generateSocialPost = async function(platform) {
        const nombreArtistico = document.getElementById('nombreArtistico').value.trim();
        const region = document.getElementById('region').value;
        
        if (!nombreArtistico) {
            window.showToast('Completa tu nombre artístico primero', 'fa-exclamation');
            return;
        }
        
        const posts = {
            facebook: `🔥 ¡Nuevo talento llanero en Puro Llano Radio! 🔥

Conoce a ${nombreArtistico}, el prometedor artista de ${region || 'el llano'} que está conquistando los escenarios del folklore llanero.

🎻 Música tradicional llanera

📱 Síguelo en nuestras redes y dale like a su música tradicional.

🇻🇪🇨🇴 #MúsicaLlanera #Folklore #PuroLlanoRadio #TalentoLlanero #Joropo #Tradición`,

            instagram: `🎶 ${nombreArtistico} 🔥

De ${region || 'el llano'} para el mundo 🌎

🎵 #YoEscuchoPuroLlanoRadio #MúsicaLlanera #FolkloreVenezolano #Joropo #PuroLlanoRadio #TalentoLlanero #ArpaLlanera #Tradición`,

            whatsapp: `🎤 *NUEVO TALENTO LLANERO*

*${nombreArtistico}* de ${region || 'el llano'}

Escúchalo en Puro Llano Radio:
https://purollanoradio.com/talento

🇻🇪🇨🇴 *La música nos une*`
        };
        
        const postText = posts[platform];
        if (postText) {
            navigator.clipboard.writeText(postText).then(() => {
                window.showToast(`Texto para ${platform} copiado!`, 'fa-share');
            });
        }
    };
});