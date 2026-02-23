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
            privacyClose: document.getElementById('privacy-close'),
            filenameBtn: document.getElementById('filename-btn'),
            filenameModal: document.getElementById('filename-modal'),
            filenameClose: document.getElementById('filename-close'),
            filenameTemplateInput: document.getElementById('filename-template-input'),
            filenamePreview: document.getElementById('filename-preview-text'),
            filenameSave: document.getElementById('filename-save'),
            filenameReset: document.getElementById('filename-reset'),
            dateFormatSelect: document.getElementById('date-format-select')
        };

        Activities.init();
        this.elements.logoutBtn.addEventListener('click', () => this.logout());
        this.initPrivacyModal();
        this.initFilenameModal();
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

    initFilenameModal() {
        let mouseDownOnBackdrop = false;

        this.dateFormatDropdown = Utils.createCustomDropdown(this.elements.dateFormatSelect);

        this.elements.filenameBtn.addEventListener('click', () => {
            const savedTemplate = localStorage.getItem(Config.STORAGE_KEYS.FILENAME_TEMPLATE) || Config.FILENAME_TEMPLATE;
            const savedFormat = localStorage.getItem(Config.STORAGE_KEYS.DATE_FORMAT) || Config.DATE_FORMAT;
            this.elements.filenameTemplateInput.value = savedTemplate;
            this.elements.dateFormatSelect.value = savedFormat;
            this.dateFormatDropdown.updateDisplay();
            this.updateFilenamePreview();
            Utils.show(this.elements.filenameModal);
        });

        this.elements.filenameClose.addEventListener('click', () => {
            Utils.hide(this.elements.filenameModal);
        });

        this.elements.filenameModal.addEventListener('mousedown', (e) => {
            mouseDownOnBackdrop = e.target === this.elements.filenameModal;
        });

        this.elements.filenameModal.addEventListener('click', (e) => {
            if (e.target === this.elements.filenameModal && mouseDownOnBackdrop) {
                Utils.hide(this.elements.filenameModal);
            }
        });

        this.elements.filenameTemplateInput.addEventListener('input', () => {
            this.updateFilenamePreview();
        });

        this.elements.dateFormatSelect.addEventListener('change', () => {
            this.updateFilenamePreview();
        });

        const separators = new Set(['_', '-', '.', ' ']);

        document.querySelectorAll('.filename-var-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const input = this.elements.filenameTemplateInput;
                const start = input.selectionStart;
                const end = input.selectionEnd;
                const val = input.value;
                const varStr = chip.dataset.var;

                const charBefore = val[start - 1];
                const charAfter = val[end];
                const prefix = (charBefore !== undefined && !separators.has(charBefore)) ? '_' : '';
                const suffix = (charAfter !== undefined && !separators.has(charAfter)) ? '_' : '';

                const insertion = prefix + varStr + suffix;
                input.value = val.slice(0, start) + insertion + val.slice(end);
                input.setSelectionRange(start + insertion.length, start + insertion.length);
                input.focus();
                this.updateFilenamePreview();
            });
        });

        this.elements.filenameSave.addEventListener('click', () => {
            const template = this.elements.filenameTemplateInput.value.trim() || Config.FILENAME_TEMPLATE;
            const dateFormat = this.elements.dateFormatSelect.value;
            localStorage.setItem(Config.STORAGE_KEYS.FILENAME_TEMPLATE, template);
            localStorage.setItem(Config.STORAGE_KEYS.DATE_FORMAT, dateFormat);
            Utils.hide(this.elements.filenameModal);
        });

        this.elements.filenameReset.addEventListener('click', () => {
            this.elements.filenameTemplateInput.value = Config.FILENAME_TEMPLATE;
            this.elements.dateFormatSelect.value = Config.DATE_FORMAT;
            this.dateFormatDropdown.updateDisplay();
            localStorage.removeItem(Config.STORAGE_KEYS.FILENAME_TEMPLATE);
            localStorage.removeItem(Config.STORAGE_KEYS.DATE_FORMAT);
            this.updateFilenamePreview();
        });
    },

    updateFilenamePreview() {
        const template = this.elements.filenameTemplateInput.value || Config.FILENAME_TEMPLATE;
        const dateFormat = this.elements.dateFormatSelect.value || Config.DATE_FORMAT;
        const exampleActivity = {
            start_date: new Date().toISOString(),
            name: 'Morning Run',
            type: 'Run',
            id: '12345678'
        };
        this.elements.filenamePreview.textContent = Utils.applyFilenameTemplate(template, exampleActivity, dateFormat) + '.gpx';
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