import json
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from scripts.demo_data import DEMO_CASES

def seed_database():
    client = TestClient(app)
    print("Seeding demo cases and suite directly into database...")

    # Health check
    h = client.get("/api/health").json()
    print(f"SvaraLens API: {h['status']} (mock_mode={h['mock_mode']})")

    for case in DEMO_CASES:
        res = client.post("/api/cases", json=case)
        if res.status_code in (200, 201):
            print(f"✓ Seeded {case['id']}: {case['scenario']}")
        else:
            print(f"Case {case['id']} status: {res.status_code}")

    # Initial run for TC-014 with injected truncation
    print("\nTriggering initial Timbre run for TC-014 with injected fault...")
    r = client.post("/api/cases/TC-014/runs/generate?injected_fault=END_TRUNCATION")
    if r.status_code == 200:
        data = r.json()
        print(f"✓ Initial run created: {data['run_id']} with {data['findings_count']} findings.")
    else:
        print(f"Run generation failed: {r.status_code}")

    print("\n✓ Seeding finished successfully!")

if __name__ == "__main__":
    seed_database()
