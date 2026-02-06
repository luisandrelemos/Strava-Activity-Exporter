const Config = {
    AUTH_URL: '/auth',
    REFRESH_URL: '/refresh',
    STRAVA_API_BASE: 'https://www.strava.com/api/v3',
    RATE_LIMIT_15MIN: 100,
    RATE_LIMIT_DAILY: 1000,
    ACTIVITIES_PER_PAGE: 30,
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'strava_access_token',
        REFRESH_TOKEN: 'strava_refresh_token',
        EXPIRES_AT: 'strava_expires_at',
        ATHLETE: 'strava_athlete'
    }
};