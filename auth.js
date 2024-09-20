// auth.js
const HASHED_PASSWORD = 'bc7d2c62af7d715641b9c5501ebe0a79e7ef349dc6e67f04c28935ecae2fc340'; // Mot de passe

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
        } else {
            alert('Mot de passe incorrect. Veuillez réessayer.');
        }
    });
});

// Fonction pour vérifier si l'utilisateur est authentifié
function isAuthenticated() {
    return !document.getElementById('appContent').classList.contains('hidden');
}
