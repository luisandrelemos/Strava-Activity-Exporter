const API = {
    requestTimestamps: [],
    dailyCount: 0,
    lastDayReset: Date.now(),

    checkRateLimit() {
        const now = Date.now();
        const fifteenMinutesAgo = now - 15 * 60 * 1000;

        this.requestTimestamps = this.requestTimestamps.filter(ts => ts > fifteenMinutesAgo);

        if (this.lastDayReset < now - 24 * 60 * 60 * 1000) {
            this.dailyCount = 0;
            this.lastDayReset = now;
        }

        if (this.requestTimestamps.length >= Config.RATE_LIMIT_15MIN) {
            const oldestRequest = Math.min(...this.requestTimestamps);
            const waitTime = Math.ceil((oldestRequest + 15 * 60 * 1000 - now) / 1000 / 60);
            throw new Error(`Rate limit reached. Please wait ${waitTime} minutes.`);
        }

        if (this.dailyCount >= Config.RATE_LIMIT_DAILY) {
            throw new Error('Daily rate limit reached. Please try again tomorrow.');
        }
    },

    recordRequest() {
        this.requestTimestamps.push(Date.now());
        this.dailyCount++;
    },

    async request(endpoint, options = {}, signal = null) {
        this.checkRateLimit();

        const token = await Auth.getAccessToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${Config.STRAVA_API_BASE}${endpoint}`, {
            ...options,
            signal,
            headers: {
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });

        this.recordRequest();

        if (!response.ok) {
            if (response.status === 401) {
                Auth.logout();
                window.location.reload();
                throw new Error('Session expired. Please login again.');
            }
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait before making more requests.');
            }
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `API error: ${response.status}`);
        }

        return response.json();
    },

    async getActivities(page = 1, perPage = Config.ACTIVITIES_PER_PAGE, signal = null) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: perPage.toString()
        });
        return this.request(`/athlete/activities?${params}`, {}, signal);
    },

    async getActivityStreams(id) {
        const types = ['time', 'latlng', 'altitude', 'heartrate', 'cadence', 'watts', 'distance'];
        const params = new URLSearchParams({
            keys: types.join(','),
            key_by_type: 'true'
        });

        try {
            return await this.request(`/activities/${id}/streams?${params}`);
        } catch (error) {
            console.warn(`Could not fetch streams for activity ${id}:`, error.message);
            return null;
        }
    }
};