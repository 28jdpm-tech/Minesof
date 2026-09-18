document.addEventListener('DOMContentLoaded', () => {
    const mapAuthError = (code) => {
        switch (code) {
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
            case 'auth/invalid-login-credentials':
            case 'auth/wrong-password':
                return 'Correo o contraseña incorrectos. Verifica que el usuario exista.';
            case 'auth/invalid-email':
                return 'El formato del correo electrónico no es válido.';
            case 'auth/too-many-requests':
                return 'Demasiados intentos fallidos. Por favor, intenta de nuevo más tarde.';
            case 'auth/email-already-in-use':
                return 'El correo electrónico ya está registrado en otra cuenta.';
            case 'auth/weak-password':
                return 'La contraseña es muy débil (mínimo 6 caracteres).';
            case 'auth/network-request-failed':
                return 'Error de conexión a internet.';
            default:
                return 'Ocurrió un error: ' + code;
        }
    };

    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');
    const appContainer = document.querySelector('.app-container');

    // Hide app container initially until auth is verified
    if (appContainer) {
        appContainer.style.display = 'none';
    }

    // Auth State Listener
    window.auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            loginOverlay.style.display = 'none';
            if (appContainer) appContainer.style.display = 'flex';

            const emailDisplay = document.getElementById('currentUserEmailDisplay');
            if (emailDisplay) emailDisplay.textContent = user.email || 'Usuario';

            // MULTI-TENANT: Detect user change and clear old data
            window.currentUserTenant = user.uid;

            const lastTenant = localStorage.getItem('minesof_last_tenant');
            if (lastTenant && lastTenant !== user.uid) {
                // Different user logging in - clear all cached data
                StorageManager.clearAll();
                localStorage.removeItem('galeria_admin_password');
                localStorage.removeItem('galeria_observations');
                localStorage.setItem('minesof_last_tenant', user.uid);
                
                // Force a reload so memory state (FOODX_DATA) starts perfectly clean for the new user
                window.location.reload();
                return;
            }
            localStorage.setItem('minesof_last_tenant', user.uid);

            // Reload the configuration for this specific tenant
            const config = StorageManager.getConfig();
            Object.assign(FOODX_DATA, config);
        } else {
            // User is signed out
            loginOverlay.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'none';
        }
    });

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const loginConfirmPassword = document.getElementById('loginConfirmPassword');

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            const email = loginEmail.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!email || !emailRegex.test(email)) {
                alert('Por favor, ingresa un correo electrónico válido en el campo de arriba para enviarte el enlace de recuperación (ejemplo: usuario@correo.com).');
                return;
            }
            window.auth.languageCode = 'es';
            window.auth.sendPasswordResetEmail(email)
                .then(() => {
                    alert('¡Correo enviado a ' + email + '!\n\n1. Revisa tu bandeja (o Spam) y haz clic en el enlace para crear tu nueva contraseña.\n2. Luego, regresa a esta pantalla e inicia sesión normalmente.');
                    document.getElementById('loginPassword').value = '';
                })
                .catch((error) => {
                    alert('Error: ' + mapAuthError(error.code));
                });
        });
    }

    const authToggleLink = document.getElementById('authToggleLink');
    const btn = document.getElementById('loginBtn');
    let isLoginMode = true;

    if (authToggleLink) {
        authToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                authTitle.textContent = 'Bienvenido a Minesof';
                if (authSubtitle) authSubtitle.textContent = 'Inicia sesión para acceder a tu sistema';
                btn.textContent = 'Ingresar';
                authToggleLink.innerHTML = '&iquest;No tienes cuenta? Reg&iacute;strate aqu&iacute;';
                if (forgotPasswordLink && forgotPasswordLink.parentElement) forgotPasswordLink.parentElement.style.display = 'block';
                if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
                if (loginConfirmPassword) loginConfirmPassword.value = '';
            } else {
                authTitle.textContent = 'Crear Nueva Cuenta';
                if (authSubtitle) authSubtitle.textContent = 'Crea una cuenta para empezar a usar el sistema';
                btn.textContent = 'Registrarse';
                authToggleLink.innerHTML = '&iquest;Ya tienes cuenta? Inicia Sesi&oacute;n';
                if (forgotPasswordLink && forgotPasswordLink.parentElement) forgotPasswordLink.parentElement.style.display = 'none';
                if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'block';
            }
        });
    }

    // Toggle Password Visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);

            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.innerHTML = '<i data-lucide="eye-off" style="width: 20px; height: 20px; color: #000000; font-weight: 600;"></i>';
                } else {
                    input.type = 'password';
                    btn.innerHTML = '<i data-lucide="eye" style="width: 20px; height: 20px; color: #000000; font-weight: 600;"></i>';
                }
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
        });
    });

    // Login Submit
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginEmail.value.trim();
        const password = loginPassword.value;

        loginError.style.display = 'none';
        
        // Validacion estricta de correo (debe tener algo@algo.com)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            loginError.textContent = 'Por favor, ingresa un correo electrónico válido (ejemplo: usuario@correo.com).';
            loginError.style.display = 'block';
            return;
        }

        btn.textContent = 'Procesando...';
        btn.disabled = true;

        if (!isLoginMode) {
            const confirmPass = loginConfirmPassword ? loginConfirmPassword.value : '';
            if (password !== confirmPass) {
                loginError.textContent = 'Las contraseñas no coinciden.';
                loginError.style.display = 'block';
                btn.textContent = 'Registrarse';
                btn.disabled = false;
                return;
            }
        }

        if (isLoginMode) {
            window.auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    btn.textContent = 'Ingresar';
                    btn.disabled = false;
                    loginForm.reset();
                })
                .catch((error) => {
                    loginError.textContent = mapAuthError(error.code);
                    loginError.style.display = 'block';
                    btn.textContent = 'Ingresar';
                    btn.disabled = false;
                });
        } else {
            window.auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    btn.textContent = 'Registrarse';
                    btn.disabled = false;
                    loginForm.reset();
                })
                .catch((error) => {
                    loginError.textContent = mapAuthError(error.code);
                    loginError.style.display = 'block';
                    btn.textContent = 'Registrarse';
                    btn.disabled = false;
                });
        }
    });

    // Logout Click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            StorageManager.clearAll();
            localStorage.removeItem('minesof_last_tenant');
            window.auth.signOut().then(() => {
                window.location.reload();
            });
        });
    }
});
