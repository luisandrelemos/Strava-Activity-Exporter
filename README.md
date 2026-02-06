# Strava Activity Exporter

Export your Strava activities to GPX, TCX, or FIT formats.

## Features

- OAuth authentication with Strava
- Browse all activities with search, filters, and sorting
- Export to FIT (original file), GPX, or TCX
- Batch export multiple activities as ZIP
- Pagination for large activity lists

## Setup

### 1. Create Strava API Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application:
   - **Website**: `http://localhost:3000`
   - **Authorization Callback Domain**: `localhost`
3. Note your **Client ID** and **Client Secret**

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
```

### 3. Run

```bash
npm install
npm start
```

Open `http://localhost:3000`

## Export Formats

| Format | Description |
|--------|-------------|
| FIT | Original file from your device |
| GPX | GPS track with coordinates and elevation |
| TCX | Training data with heart rate, cadence, and power |

## Rate Limits

Strava API limits: 100 requests/15 min, 1000 requests/day.

## License

MIT