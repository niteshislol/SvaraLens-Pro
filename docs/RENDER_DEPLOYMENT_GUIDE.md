# SvaraLens PRO — Render Deployment Guide

This guide walks you through deploying **SvaraLens PRO** to [Render](https://render.com) so that both the **Landing Page** and the **PRO Engineering Workbench** are live on the internet with a public HTTPS URL (e.g., `https://svaralens-pro.onrender.com`).

---

## Architecture Overview on Render

SvaraLens runs as a single unified service:
* **Landing Page**: Served at `https://<your-app>.onrender.com/`
* **Workbench Application**: Served at `https://<your-app>.onrender.com/app/`
* **Backend API & Swagger Docs**: Served at `https://<your-app>.onrender.com/api/` and `https://<your-app>.onrender.com/api/docs`
* **Health Check**: Available at `https://<your-app>.onrender.com/api/health`

---

## Option 1: Deploy with Docker (Recommended — 3 Minutes)

Because SvaraLens contains a multi-stage `Dockerfile` that automatically compiles both the React landing page and the Vite workbench into production bundles and packages them with the FastAPI backend, Docker deployment on Render is completely turnkey.

### Step 1: Push latest code to GitHub
Make sure your GitHub repository (`https://github.com/niteshislol/SvaraLens-Pro.git`) is up to date on branch `main`.

### Step 2: Create a New Web Service on Render
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click the **"New +"** button at the top right and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"** and click **Next**.
4. Select or connect your GitHub repository: `niteshislol/SvaraLens-Pro`.
   *(If you don't see it, click "Configure account" to grant Render access to your GitHub repo).*

### Step 3: Configure the Web Service
Configure the settings as follows:
* **Name**: `svaralens-pro` (or any custom name)
* **Region**: Choose the region closest to you (e.g. *Oregon (US West)*, *Frankfurt (EU)*, or *Singapore*)
* **Branch**: `main`
* **Runtime**: Select **`Docker`**
* **Instance Type**: Select **Free** (or Starter/Standard)
* **Health Check Path**: `/api/health`

### Step 4: Add Environment Variables
Scroll down to the **"Environment Variables"** section and add the following keys:

| Key | Value | Description |
| :--- | :--- | :--- |
| `GNANI_API_KEY` | `vach_1ytE2CY5...` | Your live Gnani API key |
| `JWT_SECRET_KEY` | *(Click "Generate" or enter a 32+ char secret)* | Secret for signing JWT authentication tokens |
| `MOCK_MODE` | `false` | Enables live synthesis and recognition via Gnani |
| `ALLOW_CREDENTIALS` | `true` | Allows authenticated session cookies & tokens |

> [!NOTE]
> Render automatically sets `PORT` (usually `10000`) and passes `RENDER_EXTERNAL_URL`. The SvaraLens Dockerfile and backend automatically detect `$PORT` and bind to it.

### Step 5: Deploy
Click **"Create Web Service"** (or **"Deploy Web Service"**).

Render will now:
1. Build the landing page in a Node 20 stage (`landing/dist`).
2. Build the workbench in a Node 20 stage (`frontend/dist`).
3. Set up the Python 3.11 environment with backend dependencies.
4. Start uvicorn and verify health at `/api/health`.

Once the deploy status changes to **"Live"**, your URL will be displayed at the top left of your service dashboard!

---

## Option 2: Deploy using Render Blueprint (`render.yaml`)

If you prefer Infrastructure as Code:

1. Open your [Render Dashboard](https://dashboard.render.com/).
2. Click **"New +"** -> **"Blueprint"**.
3. Select your `SvaraLens-Pro` repository.
4. Render will detect the `render.yaml` file in the root.
5. In the configuration screen, provide your `GNANI_API_KEY`.
6. Click **"Apply"** to deploy.

---

## Option 3: Deploy as Native Python Service (Without Docker)

If you prefer using Render's native Python runtime rather than Docker:

1. Click **"New +"** -> **"Web Service"** -> Select `SvaraLens-Pro`.
2. Set **Runtime** to **`Python 3`**.
3. Set **Build Command** to:
   ```bash
   ./build.sh
   ```
4. Set **Start Command** to:
   ```bash
   PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. Add the environment variables (`GNANI_API_KEY`, `JWT_SECRET_KEY`, etc.) as described in Option 1.
6. Click **"Create Web Service"**.

---

## Default Login Credentials for QA Pilot

Once your instance is live, you can log in to the Workbench at `/app/`:

| Role | Username | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `AdminPassword@123!` | Full system access, pilot configuration |
| **QA Lead** | `qalead` | `LeadPassword@123!` | Regression approvals, capsule sign-offs |
| **QA Reviewer** | `reviewer` | `ReviewerPassword@123!` | Acoustic inspection, defect confirmation |
| **Auditor** | `auditor` | `AuditorPassword@123!` | Read-only audit trail and integrity verification |

---

## Persistent Storage Note

* On Render's **Free Tier**, container storage is ephemeral (resets on redeployment). SvaraLens automatically auto-seeds the 30 standard Indic insurance scenarios and default user accounts upon every boot, so the application is always functional.
* For long-term production persistence of generated audio and user reviews across restarts, you can upgrade to Render's **Starter** tier and attach a **Persistent Disk** mounted at `/app/data` and `/app/storage/audio` in the Render service settings.
