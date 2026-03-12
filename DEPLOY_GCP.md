# GCP Deployment

## Target architecture

- Frontend: Firebase Hosting
- Backend: Cloud Run
- Shared cache: Memorystore Redis
- Secrets: Secret Manager
- Scheduled refresh: Cloud Scheduler -> `POST /api/cache/global-refresh`

## Backend environment variables

Required:

- `DEEPSEEK_API_KEY`
- `COINGECKO_API_KEY` if you use a keyed plan
- `GNEWS_API_KEY`
- `FRED_API_KEY`
- `TUSHARE_API_TOKEN`
- `ALLOWED_ORIGINS`

Optional:

- `QWEN_API_KEY`
- `DEEPL_API_KEY`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `INTERNAL_API_BASE_URL`
- `ENABLE_INTERNAL_SCHEDULER=false`

Recommended production values:

- `PORT=8080`
- `ENABLE_INTERNAL_SCHEDULER=false`
- `ALLOWED_ORIGINS=https://<your-hosting-domain>`

## Backend deploy

Build and deploy from the `backend` directory:

```bash
gcloud run deploy crypto-pulse-backend \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars ALLOWED_ORIGINS=https://<your-hosting-domain>,ENABLE_INTERNAL_SCHEDULER=false
```

If you use Secret Manager, bind secrets to the same env var names above.

## Frontend deploy

Build the frontend with the Cloud Run URL:

```bash
VITE_API_URL=https://<your-cloud-run-url> npm run build
firebase deploy --only hosting
```

`frontend/firebase.json` already includes the SPA rewrite for `BrowserRouter`.

## Scheduler

Create a Cloud Scheduler job that sends `POST` requests to:

```text
https://<your-cloud-run-url>/api/cache/global-refresh
```

Run it once per day after your target market open time. The endpoint is idempotent and safe to rerun.
