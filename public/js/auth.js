const Auth = {
    isLoggedIn() {
        return !!localStorage.getItem(Config.STORAGE_KEYS.ACCESS_TOKEN);
    },

    async getAccessToken() {
        const expiresAt = parseInt(localStorage.getItem(Config.STORAGE_KEYS.EXPIRES_AT), 10);
        const now = Math.floor(Date.now() / 1000);

        if (expiresAt && now >= expiresAt - 300) {
            await this.refreshToken();
        }

        return localStorage.getItem(Config.STORAGE_KEYS.ACCESS_TOKEN);
    },

    async refreshToken() {
        const refreshToken = localStorage.getItem(Config.STORAGE_KEYS.REFRESH_TOKEN);

        if (!refreshToken) {
            this.logout();
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(Config.REFRESH_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            localStorage.setItem(Config.STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
            localStorage.setItem(Config.STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
            localStorage.setItem(Config.STORAGE_KEYS.EXPIRES_AT, data.expires_at);

            return data.access_token;
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            throw error;
        }
    },

    processCallback() {
        const params = Utils.parseQueryString();

        if (params.error) {
            Utils.clearQueryString();
            return { error: params.error };
        }

        if (params.access_token) {
            localStorage.setItem(Config.STORAGE_KEYS.ACCESS_TOKEN, params.access_token);
            localStorage.setItem(Config.STORAGE_KEYS.REFRESH_TOKEN, params.refresh_token);
            localStorage.setItem(Config.STORAGE_KEYS.EXPIRES_AT, params.expires_at);

            const athlete = {
                id: params.athlete_id,
                firstname: params.athlete_firstname,
                lastname: params.athlete_lastname,
                profile: params.athlete_profile
            };
            localStorage.setItem(Config.STORAGE_KEYS.ATHLETE, JSON.stringify(athlete));
            Utils.clearQueryString();

            return { success: true, athlete };
        }

        return null;
    },

    getAthlete() {
        const stored = localStorage.getItem(Config.STORAGE_KEYS.ATHLETE);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return null;
            }
        }
        return null;
    },

    logout() {
        localStorage.removeItem(Config.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(Config.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(Config.STORAGE_KEYS.EXPIRES_AT);
        localStorage.removeItem(Config.STORAGE_KEYS.ATHLETE);
    }
};