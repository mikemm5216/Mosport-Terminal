# Mosport Terminal

## Environment Variables

Local development uses `.env.local` in the project root.

Copy:

```bash
cp .env.example .env.local
```

Fill values locally.

**Never commit `.env.local`.**

Production variables must be configured in Railway → Variables.

After changing `.env.local`, restart the dev server.

## Data Ingestion

### Hot Ingestion
To manually trigger hot data ingestion:

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/admin/ingest/hot" `
  -Method Post `
  -Headers @{ "x-ingest-secret" = "your_secret" }
```

**cURL:**
```bash
curl -X POST http://localhost:3001/api/admin/ingest/hot \
  -H "x-ingest-secret: your_secret"
```
