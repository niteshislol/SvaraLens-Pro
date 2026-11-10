#!/usr/bin/env python3
"""
SvaraLens PRO — Render Free Tier Smart Wakeup & Keep-Alive Script
Reference implementation based on: https://github.com/patsarun2545/render-free-tier-wakeup

Strategy:
1. Render spins down after 15 minutes of inactivity. Cold start takes ~50s.
2. Render gives 750 free compute hours/month. Running 24/7 burns 744 hours (leaving zero margin).
3. Solution: Wake up at 07:50 (handling the ~50s cold start), ping every 14 minutes between
   08:00 and 18:00, then let the service sleep at night (using only ~300 hours/month).
"""

import sys
import time
import os
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

DEFAULT_URL = os.getenv("TARGET_URL", "http://127.0.0.1:8000")
DEFAULT_TZ_OFFSET_HOURS = float(os.getenv("TIMEZONE_OFFSET_HOURS", "5.5"))  # Default IST (+5:30)


def get_current_local_time(offset_hours: float) -> datetime:
    tz = timezone(timedelta(hours=offset_hours))
    return datetime.now(tz)


def ping_service(url: str, timeout: int = 65) -> tuple[bool, int, float, str]:
    """Sends a GET request to the target ping endpoint.
    Handles Render cold starts with a generous 65s timeout."""
    endpoint = url.rstrip("/")
    if not endpoint.endswith("/ping") and not endpoint.endswith("/health"):
        endpoint += "/ping"

    start_time = time.time()
    try:
        req = urllib.request.Request(
            endpoint,
            headers={
                "User-Agent": "SvaraLens-RenderWakeup/1.0 (+https://github.com/niteshislol/SvaraLens-Pro)",
                "Accept": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = time.time() - start_time
            body = resp.read().decode("utf-8", errors="replace")
            return (resp.status == 200, resp.status, elapsed, body[:120])
    except urllib.error.HTTPError as e:
        elapsed = time.time() - start_time
        return (False, e.code, elapsed, str(e))
    except Exception as e:
        elapsed = time.time() - start_time
        return (False, 0, elapsed, str(e))


def run_single_ping(url: str):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Pinging {url}...")
    ok, status, elapsed, detail = ping_service(url)
    if ok:
        print(f"✓ Success (HTTP {status}) in {elapsed:.2f}s: {detail}")
        sys.exit(0)
    else:
        print(f"✗ Failed (Status {status}) in {elapsed:.2f}s: {detail}")
        sys.exit(1)


def run_scheduler(url: str, start_hour: int = 8, end_hour: int = 18, interval_mins: int = 14, tz_offset: float = 5.5):
    print("=" * 65)
    print("SvaraLens PRO — Render Free Tier Smart Keep-Alive Daemon")
    print(f"Target URL:       {url}")
    print(f"Active Window:    {start_hour:02d}:00 to {end_hour:02d}:00 (UTC+{tz_offset})")
    print(f"Ping Interval:    Every {interval_mins} minutes during active window")
    print("=" * 65)

    while True:
        now = get_current_local_time(tz_offset)
        hour = now.hour
        is_active = (start_hour <= hour < end_hour)

        time_str = now.strftime('%Y-%m-%d %H:%M:%S')

        if is_active:
            print(f"[{time_str}] Active hours — sending keep-alive ping...")
            ok, status, elapsed, detail = ping_service(url)
            status_text = "READY" if elapsed < 5 else "COLD_START_RESOLVED"
            if ok:
                print(f"[{time_str}] ✓ Ping OK ({status_text}) — HTTP {status} in {elapsed:.2f}s")
            else:
                print(f"[{time_str}] ⚠️ Ping error — HTTP {status} in {elapsed:.2f}s: {detail}")

            sleep_seconds = interval_mins * 60
            print(f"Sleeping for {interval_mins} minutes until next ping...\n")
            time.sleep(sleep_seconds)
        else:
            print(f"[{time_str}] Outside active window ({hour:02d}:00). Letting service sleep to save compute hours.")
            # Calculate sleep until 07:50 next morning
            wake_hour = max(0, start_hour - 1)
            wake_minute = 50
            next_wake = now.replace(hour=wake_hour, minute=wake_minute, second=0, microsecond=0)
            if now >= next_wake:
                next_wake += timedelta(days=1)
            seconds_until_wake = max(60, (next_wake - now).total_seconds())
            hours_until_wake = seconds_until_wake / 3600
            print(f"Next wake-up scheduled at {next_wake.strftime('%Y-%m-%d %H:%M:%S')} (in {hours_until_wake:.1f} hours).")
            # Sleep in chunks to allow graceful interruption
            time.sleep(min(seconds_until_wake, 1800))


def main():
    parser = argparse.ArgumentParser(description="Render Free Tier Keep-Alive & Wakeup Tool")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"Target base URL (default: {DEFAULT_URL})")
    parser.add_argument("--once", action="store_true", help="Send a single ping and exit")
    parser.add_argument("--start-hour", type=int, default=8, help="Active window start hour 0-23 (default: 8)")
    parser.add_argument("--end-hour", type=int, default=18, help="Active window end hour 0-23 (default: 18)")
    parser.add_argument("--interval", type=int, default=14, help="Minutes between pings (default: 14)")
    parser.add_argument("--tz-offset", type=float, default=DEFAULT_TZ_OFFSET_HOURS, help="Timezone offset hours (default: +5.5 for IST)")
    args = parser.parse_args()

    if args.once:
        run_single_ping(args.url)
    else:
        run_scheduler(
            url=args.url,
            start_hour=args.start_hour,
            end_hour=args.end_hour,
            interval_mins=args.interval,
            tz_offset=args.tz_offset
        )


if __name__ == "__main__":
    main()
