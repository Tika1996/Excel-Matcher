// auth.js
const HASHED_PASSWORD = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // Mot de passe : admin

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