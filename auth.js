/* ==========================================================================
   AUTH.JS - SISTEMA DE AUTENTICACIÓN FIREBASE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    
    const authModal = document.getElementById('authModal');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const authSwitchBtn = document.getElementById('authSwitchBtn');
    const authCloseBtn = document.getElementById('authCloseBtn');
    const authError = document.getElementById('authError');
    const authSuccess = document.getElementById('authSuccess');
    const userInfo = document.getElementById('userInfo');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    let isLoginMode = true;
    let currentUser = null;
    let db;
    let auth;

    try {
        auth = firebase.auth();
        db = firebase.database();
    } catch(e) {
        console.error('Firebase no disponible:', e);
        return;
    }

    window.openAuthModal = function(mode = 'login') {
        isLoginMode = mode === 'login';
        updateAuthUI();
        if(authModal) authModal.classList.add('active');
    };

    window.closeAuthModal = function() {
        if(authModal) authModal.classList.remove('active');
        clearAuthForms();
    };

    function updateAuthUI() {
        if (!authTitle || !authSubmitBtn || !authSwitchBtn) return;
        
        if (isLoginMode) {
            authTitle.textContent = 'Iniciar Sesión';
            authSubmitBtn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Entrar';
            authSwitchBtn.innerHTML = '¿No tienes cuenta? <a href="#" onclick="toggleAuthMode(event, \'register\')">Regístrate</a>';
        } else {
            authTitle.textContent = 'Crear Cuenta';
            authSubmitBtn.innerHTML = '<i class="fa fa-user-plus"></i> Registrarme';
            authSwitchBtn.innerHTML = '¿Ya tienes cuenta? <a href="#" onclick="toggleAuthMode(event, \'login\')">Iniciar Sesión</a>';
        }
        if (authError) authError.style.display = 'none';
        if (authSuccess) authSuccess.style.display = 'none';
    }

    window.toggleAuthMode = function(e, mode) {
        e.preventDefault();
        isLoginMode = mode === 'login';
        updateAuthUI();
    };

    if (authTabs) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                authTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                isLoginMode = tab.dataset.mode === 'login';
                updateAuthUI();
            });
        });
    }

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('authEmail').value.trim();
            const password = document.getElementById('authPassword').value;
            const nombre = document.getElementById('authNombre')?.value.trim();
            
            if (!email || !password) {
                showAuthError('Por favor completa todos los campos');
                return;
            }

            if (!isLoginMode && !nombre) {
                showAuthError('Por favor ingresa tu nombre');
                return;
            }

            authSubmitBtn.disabled = true;
            authSubmitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Procesando...';

            try {
                if (isLoginMode) {
                    const userCredential = await auth.signInWithEmailAndPassword(email, password);
                    currentUser = userCredential.user;
                    await onLoginSuccess(userCredential.user);
                } else {
                    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                    currentUser = userCredential.user;
                    
                    await auth.currentUser.updateProfile({
                        displayName: nombre
                    });

                    await saveUserToDatabase(userCredential.user, nombre, email);
                    await onLoginSuccess(userCredential.user);
                }
            } catch (error) {
                console.error('Auth error:', error);
                let errorMsg = getAuthErrorMessage(error.code);
                showAuthError(errorMsg);
            } finally {
                authSubmitBtn.disabled = false;
                updateAuthUI();
            }
        });
    }

    async function saveUserToDatabase(user, nombre, email) {
        const userRef = db.ref('usuarios/' + user.uid);
        await userRef.set({
            uid: user.uid,
            nombre: nombre,
            email: email,
            fechaRegistro: firebase.database.ServerValue.TIMESTAMP,
            ultimoLogin: firebase.database.ServerValue.TIMESTAMP,
            rol: 'artista'
        });
    }

    async function onLoginSuccess(user) {
        if (authSuccess) {
            authSuccess.textContent = '¡Bienvenido! 🎸';
            authSuccess.style.display = 'block';
        }
        
        setTimeout(() => {
            window.closeAuthModal();
            updateUserUI(user);
            window.showToast('¡Sesión iniciada correctamente!', 'fa-user-check');
        }, 500);

        if (user) {
            const userRef = db.ref('usuarios/' + user.uid);
            await userRef.update({
                ultimoLogin: firebase.database.ServerValue.TIMESTAMP
            });
        }
    }

    function getAuthErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'Este correo ya está registrado',
            'auth/invalid-email': 'Correo electrónico inválido',
            'auth/operation-not-allowed': 'Operación no permitida',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
            'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
            'auth/user-not-found': 'No existe una cuenta con este correo',
            'auth/wrong-password': 'Contraseña incorrecta',
            'auth/invalid-credential': 'Credenciales incorrectas',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
            'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
        };
        return messages[code] || 'Error de autenticación. Intenta de nuevo';
    }

    function showAuthError(message) {
        if (authError) {
            authError.textContent = message;
            authError.style.display = 'block';
        }
    }

    function clearAuthForms() {
        if (authForm) authForm.reset();
        if (authError) authError.style.display = 'none';
        if (authSuccess) authSuccess.style.display = 'none';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await auth.signOut();
                currentUser = null;
                updateUserUI(null);
                window.showToast('Sesión cerrada', 'fa-sign-out-alt');
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    if (authCloseBtn) {
        authCloseBtn.addEventListener('click', window.closeAuthModal);
    }

    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) window.closeAuthModal();
        });
    }

    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        updateUserUI(user);
        
        if (user) {
            window.currentUser = user;
            if (window.onUserLoggedIn) {
                window.onUserLoggedIn(user);
            }
        } else {
            window.currentUser = null;
            if (window.onUserLoggedOut) {
                window.onUserLoggedOut();
            }
        }
    });

    function updateUserUI(user) {
        const authButtons = document.querySelector('.auth-buttons');
        
        if (user && userInfo && userNameDisplay && logoutBtn && loginBtn) {
            userInfo.style.display = 'flex';
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-flex';
            
            const displayName = user.displayName || user.email.split('@')[0];
            userNameDisplay.textContent = displayName;
            
            if (authButtons) {
                authButtons.classList.add('logged-in');
            }
        } else if (userInfo && loginBtn && logoutBtn) {
            userInfo.style.display = 'none';
            loginBtn.style.display = 'inline-flex';
            logoutBtn.style.display = 'none';
            
            if (authButtons) {
                authButtons.classList.remove('logged-in');
            }
        }
    }

    window.getCurrentUser = function() {
        return currentUser;
    };

    window.isAuthenticated = function() {
        return currentUser !== null;
    };

    window.updateUserProfile = async function(profileData) {
        if (!currentUser) {
            window.showToast('Debes iniciar sesión', 'fa-exclamation-triangle');
            return false;
        }

        try {
            const profileRef = db.ref('perfiles/' + currentUser.uid);
            await profileRef.update({
                ...profileData,
                fechaActualizacion: firebase.database.ServerValue.TIMESTAMP
            });
            return true;
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            return false;
        }
    };

    window.getUserProfile = async function(uid) {
        return new Promise((resolve, reject) => {
            const profileRef = db.ref('perfiles/' + uid);
            profileRef.once('value', (snapshot) => {
                resolve(snapshot.val());
            }, (error) => {
                reject(error);
            });
        });
    };
});