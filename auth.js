// auth.js
const HASHED_PASSWORD = '145e56e08f7260f20ccc960472a93539c8ef9887b934709b3937c0b307a80574'; // Mot de passe : admin

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginScreen = document.getElementById('loginScreen');
    const appContent = document.getElementById('appContent');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const hashedPassword = sha256(password);

        if (hashedPassword === HASHED_PASSWORD) {
            loginScreen.classList.add('hidden');
            appContent.classList.remove('hidden');
            // Déclencher l'initialisation de l'application
            initializeApp();
        } else {
            alert('Mot de passe incorrect. Veuillez réessayer.');
        }
    });
});

// Fonction pour vérifier si l'utilisateur est authentifié
function isAuthenticated() {
    return !document.getElementById('appContent').classList.contains('hidden');
}

// Fonction pour initialiser l'application
function initializeApp() {
    if (typeof initApp === 'function') {
        initApp();
    } else {
        console.error("La fonction initApp n'est pas définie dans app.js");
    }
}
