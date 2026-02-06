(function showConsoleArt() {
    console.log(`%c
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     █████╗  ██████╗████████╗██╗███████╗██╗  ██╗██████╗    ║
║    ██╔══██╗██╔════╝╚══██╔══╝██║██╔════╝╚██╗██╔╝██╔══██╗   ║
║    ███████║██║        ██║   ██║█████╗   ╚███╔╝ ██████╔╝   ║
║    ██╔══██║██║        ██║   ██║██╔══╝   ██╔██╗ ██╔═══╝    ║
║    ██║  ██║╚██████╗   ██║   ██║███████╗██╔╝ ██╗██║        ║
║    ╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝╚══════╝╚═╝  ╚═╝╚═╝        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
%c Strava Activity Exporter %c by Luís Lemos
    `,
        "color: #FC4C02; font-weight: bold;",
        "background: #FC4C02; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;",
        "color: #ffffff;"
    );
})();

const App = {
    elements: {},

    init() {
        this.elements = {
            loginSection: document.getElementById('login-section'),
            appSection: document.getElementById('app-section'),
            errorMessage: document.getElementById('error-message'),
            userSection: document.getElementById('user-section'),
            userAvatar: document.getElementById('user-avatar'),
            userName: document.getElementById('user-name'),
            userProfileLink: document.getElementById('user-profile-link'),
            logoutBtn: document.getElementById('logout-btn'),
            header: document.querySelector('.main-header'),
            footer: document.querySelector('.main-footer'),
            privacyBtn: document.getElementById('privacy-btn'),
            privacyModal: document.getElementById('privacy-modal'),
            privacyClose: document.getElementById('privacy-close')
        };

        Activities.init();
        this.elements.logoutBtn.addEventListener('click', () => this.logout());
        this.initPrivacyModal();
        this.handleAuth();
    },

    initPrivacyModal() {
        this.elements.privacyBtn.addEventListener('click', () => {
            Utils.show(this.elements.privacyModal);
        });

        this.elements.privacyClose.addEventListener('click', () => {
            Utils.hide(this.elements.privacyModal);
        });

        this.elements.privacyModal.addEventListener('click', (e) => {
            if (e.target === this.elements.privacyModal) {
                Utils.hide(this.elements.privacyModal);
            }
        });
    },

    handleAuth() {
        const callbackResult = Auth.processCallback();

        if (callbackResult?.error) {
            this.showError(`Login failed: ${callbackResult.error}`);
            this.showLogin();
            return;
        }

        if (callbackResult?.success || Auth.isLoggedIn()) {
            this.showApp();
            return;
        }

        this.showLogin();
    },

    showLogin() {
        Utils.show(this.elements.loginSection);
        Utils.hide(this.elements.appSection);
        Utils.hide(this.elements.userSection);
        Utils.hide(this.elements.header);
    },

    async showApp() {
        Utils.hide(this.elements.loginSection);
        Utils.show(this.elements.appSection);
        Utils.show(this.elements.userSection);
        Utils.show(this.elements.header);

        const athlete = Auth.getAthlete();
        if (athlete) {
            this.elements.userName.textContent = `${athlete.firstname} ${athlete.lastname}`.trim() || 'Athlete';
            this.elements.userAvatar.src = athlete.profile || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23ddd"/><circle cx="50" cy="40" r="20" fill="%23999"/><ellipse cx="50" cy="90" rx="35" ry="30" fill="%23999"/></svg>';
            if (athlete.id) {
                this.elements.userProfileLink.href = `https://www.strava.com/athletes/${athlete.id}`;
            }
        }

        await Activities.loadAll();
    },

    logout() {
        Auth.logout();
        Activities.reset();
        this.showLogin();
    },

    showError(message) {
        this.elements.errorMessage.textContent = message;
        Utils.show(this.elements.errorMessage);
        setTimeout(() => Utils.hide(this.elements.errorMessage), 10000);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());