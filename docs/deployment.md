# Crop Disease Predictor — GCP Deployment Guide

## What This Deploys

| | URL |
|---|---|
| Frontend | `https://crop-disease-predictor.osherboudara.com` |
| API | `https://api.crop-disease-predictor.osherboudara.com` |

- **API runtime**: GCP Cloud Run (`us-central1`) — scales to zero when idle
- **Container images**: GCP Artifact Registry
- **Frontend hosting**: Cloudflare Pages (free)
- **Models**: pulled from GCS at build time and baked into the Docker image

Estimated cost at low traffic: **~$0.20–$0.50/month** (Artifact Registry image storage).
Cloud Run, Cloud Build, and Cloudflare Pages all have free tiers that cover typical hobby usage.

---

## Prerequisites

Before starting, confirm you have:

- [ ] `gcloud` CLI installed — run `gcloud --version` to check.
  Install from: https://cloud.google.com/sdk/docs/install
- [ ] A GCP project with billing enabled
- [ ] Models uploaded to GCS at `gs://crop-disease-predictor-model/models/`
  Verify: `gcloud storage ls gs://crop-disease-predictor-model/models/`
- [ ] On the `deploy/gcp-cloud-run` git branch

---

## Part 1 — Code Setup

These steps prepare the repository for containerized deployment. **If you are on the
`deploy/gcp-cloud-run` branch, steps 1–5 are already committed — skip to Step 6.**

---

## Step 1 — Create a Deployment Branch

Create and switch to a new branch named `deploy/gcp-cloud-run` in your git client or IDE.

---

## Step 2 — Add API Runtime Dependencies

Create `requirements-api.txt` in the repository root. This is a lean dependency file
for the container — it excludes training and notebook packages.

```txt
fastapi>=0.136.0
uvicorn[standard]>=0.46.0
python-multipart>=0.0.26
pillow>=12.2.0
numpy<2
tensorflow==2.10.*
```

---

## Step 3 — Create Docker Files

Create `Dockerfile` in the repository root:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements-api.txt .
RUN pip install --no-cache-dir -r requirements-api.txt

COPY api ./api
COPY modeling/models ./modeling/models

ENV PORT=8080
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

Create `.dockerignore` in the repository root:

```
.git
.venv
.uv-cache
frontend/node_modules
frontend/dist
data
modeling/exploration_training.ipynb
```

---

## Step 4 — Prepare the API for Production

In `api/main.py`, ensure the import is package-relative:

```python
from .utils import read_file_as_image
```

Configure CORS to allow the local dev server, local preview server, and the production domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:4173",
        "https://crop-disease-predictor.osherboudara.com",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

If you have a `__main__` block at the bottom, use port 8000:

```python
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## Step 5 — Configure the Frontend API URL

In `frontend/src/api.js`, read the API base URL from an environment variable:

```js
const API_URL = import.meta.env.VITE_API_URL ?? ''

export async function predictDisease(plant, imageFile) {
  const formData = new FormData()
  formData.append('file', imageFile)

  const res = await fetch(`${API_URL}/predict?plant=${plant}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Request failed with status ${res.status}`)
  }

  return res.json()
}
```

For local development, create `frontend/.env` (this file is gitignored):

```
VITE_API_URL=http://localhost:8000
```

For production the `VITE_API_URL` environment variable is set in the hosting provider
dashboard — do not hardcode it here.

---

## Step 6 — Create the GCS Build Configuration Files

These two files tell Cloud Build how to build the image and tell `gcloud` what to
exclude from the upload.

Create `.gcloudignore` in the repository root. This keeps the build context small by
excluding the models (pulled from GCS instead) and `node_modules` (not in `.gitignore`
but very large):

```
.git
.venv
.uv-cache
data/
modeling/models/
modeling/exploration_training.ipynb
modeling/evaluate.ipynb
frontend/node_modules/
frontend/dist/
```

Create `cloudbuild.yaml` in the repository root. This pulls the models from GCS,
builds the Docker image, and pushes it to Artifact Registry:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/gsutil'
    args: ['-m', 'cp', '-r', 'gs://crop-disease-predictor-model/models', 'modeling/']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '$_IMAGE', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '$_IMAGE']
images: ['$_IMAGE']
```

---

## Part 2 — GCP Deployment

---

## Step 7 — Log In to GCP and Set Your Project

```bash
gcloud auth login
```

This opens a browser window. Sign in with your Google account.

Set your project (replace `YOUR_PROJECT_ID` with your actual project ID):

```bash
gcloud config set project YOUR_PROJECT_ID
```

Confirm it is set:

```bash
gcloud config get-value project
```

---

## Step 8 — Enable Required GCP Services

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

This takes about 30 seconds. You only need to do this once per project.

---

## Step 9 — Create the Artifact Registry Repository

This is where your Docker image will be stored. Use `us-central1` — it is the only
region in this setup that supports Cloud Run custom domain mappings.

```bash
gcloud artifacts repositories create crop-disease-predictor-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for crop disease predictor"
```

Confirm it was created:

```bash
gcloud artifacts repositories list --location=us-central1
```

---

## Step 10 — Build and Push the Docker Image

Set these variables in Git Bash. You will reuse them in the next step too.

```bash
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
REPO=crop-disease-predictor-images
SERVICE=crop-disease-predictor-api
IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$SERVICE:latest
```

Submit the build to Cloud Build. It will:
1. Pull the trained models from `gs://crop-disease-predictor-model/models/`
2. Build the Docker image with the models baked in
3. Push the image to Artifact Registry

```bash
gcloud builds submit \
  --region=$REGION \
  --config=cloudbuild.yaml \
  --substitutions=_IMAGE=$IMAGE \
  .
```

The first build takes **10–20 minutes** — TensorFlow is large. Watch the logs in the
terminal. A successful build ends with `SUCCESS`.

If you close the terminal and need to set the variables again later, re-run the five
`export` lines above before running any `gcloud run` commands.

---

## Step 11 — Deploy to Cloud Run

```bash
gcloud run deploy $SERVICE \
  --image=$IMAGE \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=2 \
  --min-instances=0
```

When it finishes, the terminal prints a service URL like:

```
Service URL: https://crop-disease-predictor-api-xxxxxxxxxxxx-uc.a.run.app
```

Test the health endpoint with that URL:

```bash
curl https://crop-disease-predictor-api-xxxxxxxxxxxx-uc.a.run.app/health
```

Expected response:

```json
{"status": "ok", "message": "API is healthy and ready to receive requests."}
```

If the request times out on the first call, wait 10 seconds and retry — the container
cold-starts on the first request after being idle.

---

## Step 12 — Verify Domain Ownership with GCP

Before GCP can map a custom domain, it requires you to prove you own `osherboudara.com`.
This is a one-time step.

1. Go to the GCP Console: **Cloud Run → Manage custom domains → Add mapping**
2. In the dropdown, select `crop-disease-predictor-api (us-central1)`
3. For domain, choose **Verify a new domain** and type: `osherboudara.com`
4. GCP will show a **TXT record** to add to your DNS. It looks like:
   ```
   Type:  TXT
   Host:  @
   Value: google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
5. In **GoDaddy**, go to **My Products → osherboudara.com → DNS → Add New Record**
6. Add the TXT record exactly as shown and save
7. Back in GCP, click **Verify** — DNS can take a few minutes to propagate; if it fails,
   wait 5 minutes and try again

---

## Step 13 — Map the API Custom Domain

Once `osherboudara.com` is verified:

1. In **Cloud Run → Manage custom domains → Add mapping**
2. Select service: `crop-disease-predictor-api (us-central1)`
3. Enter domain: `api.crop-disease-predictor.osherboudara.com`
4. Click **Continue** — GCP shows a CNAME record to add. It will look like:
   ```
   Type:  CNAME
   Name:  api.crop-disease-predictor
   Value: ghs.googlehosted.com.
   ```
5. In **GoDaddy**, go to **My Products → osherboudara.com → DNS → Add New Record**, add the CNAME exactly as shown, and save
6. GCP handles SSL automatically once DNS propagates (usually 5–30 minutes)

Test when ready:

```bash
curl https://api.crop-disease-predictor.osherboudara.com/health
```

---

## Step 14 — Deploy the Frontend (Cloudflare Pages)

Cloudflare Pages is free, builds from GitHub, and redeploys automatically on every push.

### Create the Pages project

1. Go to https://dash.cloudflare.com and sign in
2. In the left sidebar click **Workers & Pages**
3. Click **Create** → select the **Pages** tab (not Workers)
4. Click **Connect to Git** → select the `osherboudara99/crop-disease-detector` repository
5. On the build settings screen fill in:
   ```
   Project name:          crop-disease-predictor
   Production branch:     main
   Root directory:        frontend
   Build command:         npm run build
   Build output dir:      dist
   ```
6. Expand **Environment variables** and add:
   ```
   Variable name:  VITE_API_URL
   Value:          https://api.crop-disease-predictor.osherboudara.com
   ```
7. Click **Save and Deploy** — the first build takes 1–2 minutes

When the build finishes, Cloudflare gives you a temporary URL like
`crop-disease-predictor.pages.dev` — open it to confirm the app loads.

### Add the custom domain

1. In your Pages project go to **Custom domains → Set up a custom domain**
2. Enter: `crop-disease-predictor.osherboudara.com`
3. Cloudflare shows a CNAME record to add:
   ```
   Type:  CNAME
   Name:  crop-disease-predictor
   Value: crop-disease-predictor.pages.dev
   ```
4. In **GoDaddy → osherboudara.com → DNS → Add New Record**, add that CNAME and save
5. Cloudflare provisions SSL automatically — the domain is live within a few minutes

---

## Step 15 — Final End-to-End Test

1. Open `https://crop-disease-predictor.osherboudara.com` in a browser
2. Upload a test image and select a plant — confirm you get a prediction
3. Open browser DevTools → Network tab and confirm the request goes to
   `https://api.crop-disease-predictor.osherboudara.com/predict?plant=...`
4. Verify the API directly:
   ```bash
   curl https://api.crop-disease-predictor.osherboudara.com/health
   ```

---

## Step 16 — Merge and Tag

After everything is working, merge the branch into `main` and push.
Then create a `v1.0.0` tag to mark the first deployment.

---

## Re-deploying After API Changes

Whenever you change `api/` or the models, rerun steps 10 and 11:

```bash
# Set variables (if new terminal session)
PROJECT_ID=$(gcloud config get-value project)
REGION=us-central1
REPO=crop-disease-predictor-images
SERVICE=crop-disease-predictor-api
IMAGE=$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$SERVICE:latest

# Rebuild and redeploy
gcloud builds submit \
  --region=$REGION \
  --config=cloudbuild.yaml \
  --substitutions=_IMAGE=$IMAGE \
  .

gcloud run deploy $SERVICE \
  --image=$IMAGE \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=2 \
  --min-instances=0
```

For **frontend-only changes**, just push to the connected branch — Cloudflare Pages
redeploys automatically.

---

## GitHub Actions CI/CD

This repository includes `.github/workflows/ci-cd.yml`. GitHub Actions validates
the frontend, but Cloudflare Pages remains responsible for deploying it.

On pull requests into `main`, it:

- installs, lints, and builds the Vite frontend
- checks Python syntax for `api/` and `modeling/`

On every push to `main` after those checks pass, it:

- authenticates to Google Cloud using GitHub OIDC
- submits `cloudbuild.yaml` to Cloud Build
- deploys the new API image to Cloud Run

The workflow submits Cloud Build asynchronously, then polls build status from GitHub
Actions. This avoids requiring GitHub Actions to stream Cloud Build logs. Full logs
remain available in the Google Cloud Console.

Cloudflare Pages deploys the frontend separately from the connected `main` branch
using the settings in Step 14.

Add these repository secrets in GitHub under
**Settings -> Secrets and variables -> Actions**:

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your Google Cloud project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | The full Workload Identity Provider resource name |
| `GCP_SERVICE_ACCOUNT` | The deploy service account email |

The deploy service account needs these project roles:

- `Cloud Build Editor`
- `Cloud Run Admin`
- `Artifact Registry Writer`
- `Storage Admin`
- `Service Account User`
- `Service Usage Consumer`

It also needs `Workload Identity User` on the service account itself for the GitHub
Workload Identity principal.

---

## Cost Reference

| Service | Free tier | Estimated cost |
|---|---|---|
| Cloud Run | 2M requests/month, 360K GB-seconds | $0 at low traffic |
| Cloud Build | 120 min/day free | $0 for infrequent rebuilds |
| Artifact Registry | none | ~$0.20/month for a ~2GB image |
| GCS (models) | none | ~$0.02–$0.05/month |
| Cloudflare Pages | Unlimited | $0 |

**Total: ~$0.25/month.**

If Cloud Run fails during startup or a prediction request, increase memory to `8Gi`.
