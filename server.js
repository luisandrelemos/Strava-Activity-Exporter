require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/auth', (req, res) => {
    if (!STRAVA_CLIENT_ID) {
        return res.status(500).json({ error: 'STRAVA_CLIENT_ID not configured' });
    }

    const scope = 'read,activity:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}`;
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.redirect(`/?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return res.redirect('/?error=no_code');
    }

    try {
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Token exchange failed:', data);
            return res.redirect(`/?error=${encodeURIComponent(data.message || 'token_exchange_failed')}`);
        }

        const params = new URLSearchParams({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            athlete_id: data.athlete.id,
            athlete_firstname: data.athlete.firstname || '',
            athlete_lastname: data.athlete.lastname || '',
            athlete_profile: data.athlete.profile || ''
        });

        res.redirect(`/?${params.toString()}`);
    } catch (err) {
        console.error('OAuth callback error:', err);
        res.redirect('/?error=server_error');
    }
});

app.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token required' });
    }

    try {
        const response = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: STRAVA_CLIENT_ID,
                client_secret: STRAVA_CLIENT_SECRET,
                refresh_token: refresh_token,
                grant_type: 'refresh_token'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Token refresh failed:', data);
            return res.status(response.status).json({ error: data.message || 'refresh_failed' });
        }

        res.json({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at
        });
    } catch (err) {
        console.error('Token refresh error:', err);
        res.status(500).json({ error: 'server_error' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
        console.warn('\nWARNING: Strava credentials not configured!');
        console.warn('Copy .env.example to .env and add your credentials.\n');
    }
});