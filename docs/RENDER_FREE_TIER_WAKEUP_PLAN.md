# Render Free Tier Smart Wakeup & Keep-Alive Plan

> **Based on the architectural strategy from:** [patsarun2545/render-free-tier-wakeup](https://github.com/patsarun2545/render-free-tier-wakeup)

---

## The Problem with Render Free Tier

Render's Free Tier has two constraints that impact live web applications:

1. **Spin Down After 15 Minutes of Inactivity**  
   If no HTTP requests arrive for 15 minutes, Render spins down the container. The next user request triggers a **cold start taking ~50 seconds**, leading to slow page loads or gateway timeouts.
2. **750 Free Compute Hours/Month Limit**  
   Render grants 750 free hours/month across all free services on your account. Pinging 24/7 consumes `24 hours × 31 days = 744 hours/month` — consuming 99.2% of your monthly allotment with zero room for errors or a second service.

---

## The Solution: Two-Phase Smart Scheduling

Instead of brute-force 24/7 pinging, we split the job between two specialized tools based on their strengths:

```
07:50 AM  →  Phase 1: Pipedream wakes Render (handles the ~50s cold start)
08:00 AM  →  Service is hot & ready for users!
             Phase 2: cron-job.org takes over (pings every 14 mins: 08:00 - 18:00)
06:00 PM  →  cron-job.org stops. Render naturally sleeps at 18:15.
```

### Why This Works
* **Monthly Compute Hours Used:**
  $$\text{10 hours/day} \times 31\text{ days} = 310\text{ hours/month}$$
  This leaves **over 440 hours** safely unused within Render's 750-hour free limit!
* **Zero Cold Starts for Real Users:** The service is pre-warmed 10 minutes before business hours.
* **Overcomes 30s Timeouts:** Free cron services (like cron-job.org) timeout after 30 seconds, which would fail during cold starts. Pipedream handles long cold-start requests without timing out.

---

## Implementation Details

### Step 1: Backend Endpoint (`/ping`)
SvaraLens includes a dedicated zero-overhead ping route:
* **Endpoints:** `https://<your-service>.onrender.com/ping` and `/api/ping`
* **Response:** `HTTP 200 OK`
  ```json
  {
    "status": "ok",
    "pong": true,
    "service": "SvaraLens",
    "version": "0.1.0"
  }
  ```
* **Performance:** Executes in `<2ms` with zero database or disk load.

---

### Step 2: Morning Cold-Start Wake-Up with Pipedream (07:50 AM)

1. Sign up for a free account at [pipedream.com](https://pipedream.com/).
2. Click **"New Workflow"**.
3. Choose **Schedule** as the trigger:
   * Select **Cron Scheduler**.
   * Expression: `50 7 * * *` *(runs at 07:50 AM every day)*.
   * Timezone: Select your local timezone (e.g., `Asia/Kolkata` or `UTC`).
4. Click `+` to add a new step:
   * Select **"Send any HTTP Request"**.
   * Method: `GET`.
   * URL: `https://<your-service>.onrender.com/ping`
5. Click **Test** (Render will take ~50s to cold-start on the first test).
6. Click **Deploy**.

---

### Step 3: Daytime Keep-Alive with cron-job.org (Every 14 Minutes)

1. Sign up for a free account at [cron-job.org](https://cron-job.org/).
2. Click **"Create Cronjob"**:
   * **Title:** `SvaraLens Render Keep-Alive`
   * **URL:** `https://<your-service>.onrender.com/ping`
   * **Execution Schedule:** Custom Cron Expression
     ```
     */14 8-17 * * *
     ```
     *(Runs every 14 minutes from 08:00 AM to 05:59 PM in your selected timezone).*
3. **Advanced Settings:**
   * Request Timeout: `30 seconds`
   * Save responses in job history: **Enabled**
   * Failure notification: **Notify after 3 consecutive failures**
4. Click **Create**.

---

### Step 4: Standalone Python Alternative (`scripts/keep_alive.py`)

If you prefer running a script locally, from a homelab, or on a VM:

```bash
# One-time ping check
python3 scripts/keep_alive.py --once --url https://<your-service>.onrender.com

# Continuous smart daemon (IST timezone: 08:00 to 18:00, ping every 14m)
python3 scripts/keep_alive.py --url https://<your-service>.onrender.com --start-hour 8 --end-hour 18 --interval 14 --tz-offset 5.5
```

---

## Comparison Table

| Feature | Naive 24/7 Ping | GitHub Actions Cron | Pipedream + cron-job.org Plan |
| :--- | :--- | :--- | :--- |
| **Render Monthly Free Hours** | ❌ 744 hrs (Exceeds limit if >1 service) | ⚠️ Unreliable | ✅ ~310 hrs (Safe under 750 hrs) |
| **Morning Cold Start** | ⚠️ N/A | ❌ Fails / 1-3 hour jitter | ✅ Wakes at 07:50 AM smoothly |
| **Timing Accuracy** | ⚠️ Varies | ❌ Severe delays on peak | ✅ High accuracy |
| **Auto-Disabling** | ❌ Never | ❌ Disables after 60 days | ✅ Never auto-disabled |
| **Cost** | Free | Free | **$0 / Month (100% Free)** |
