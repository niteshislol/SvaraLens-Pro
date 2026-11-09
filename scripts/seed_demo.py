import json
import requests
import sys

API_BASE = "http://localhost:8000/api"

DEMO_SUITE = {
    "id": "suite-insurance-hi",
    "name": "Insurance Hindi Voice Test Suite",
    "description": "Pre-release Indic speech fidelity and regression suite covering insurance, banking reminders, and mandatory disclosures."
}

DEMO_CASES = [
    {
        "id": "TC-014",
        "suite_id": "suite-insurance-hi",
        "scenario": "Insurance Premium Reminder (Demo Signature Case)",
        "language": "hi-IN",
        "reference_text": "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।",
        "critical_phrases": [
            {"text": "₹4,250", "variants": ["4,250", "4250"], "severity": "HIGH"},
            {"text": "12 नवंबर", "variants": ["12 november", "बारह नवंबर"], "severity": "HIGH"},
            {"text": "विलंब शुल्क", "variants": ["late fee", "late charge"], "severity": "CRITICAL"}
        ],
        "voice": "ananya",
        "speed": 1.0,
        "channel": "standard",
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-001",
        "suite_id": "suite-insurance-hi",
        "scenario": "Motor Insurance Policy Expiry Notice",
        "language": "hi-IN",
        "reference_text": "आपकी कार बीमा पॉलिसी 25 दिसंबर को समाप्त हो रही है। बिना रुकावट कवरेज के लिए तुरंत रिन्यू करें।",
        "critical_phrases": [
            {"text": "कार बीमा पॉलिसी", "variants": ["car insurance policy"], "severity": "HIGH"},
            {"text": "25 दिसंबर", "variants": ["25 december"], "severity": "HIGH"},
            {"text": "तुरंत रिन्यू", "variants": ["renew immediately"], "severity": "MEDIUM"}
        ],
        "voice": "ananya",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-002",
        "suite_id": "suite-insurance-hi",
        "scenario": "Health Claim Pre-Authorization Hinglish",
        "language": "hinglish",
        "reference_text": "Aapka health claim pre-authorization amount ₹75,000 approve ho gaya hai. Network hospital me cashless facility available hai.",
        "critical_phrases": [
            {"text": "₹75,000", "variants": ["75000", "75,000 rupees"], "severity": "CRITICAL"},
            {"text": "cashless facility", "variants": ["कैशलेस सुविधा"], "severity": "HIGH"},
            {"text": "pre-authorization", "variants": ["प्री-ऑथराइजेशन"], "severity": "HIGH"}
        ],
        "voice": "ananya",
        "speed": 1.0,
        "channel": "standard",
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-003",
        "suite_id": "suite-insurance-hi",
        "scenario": "KYC Verification Reminder Hinglish",
        "language": "hinglish",
        "reference_text": "Kripya apna mandatory KYC verification 3 days ke andar complete karein taaki payouts me delay na ho.",
        "critical_phrases": [
            {"text": "KYC verification", "variants": ["केवाईसी वेरिफिकेशन"], "severity": "HIGH"},
            {"text": "3 days", "variants": ["teen din", "3 दिन"], "severity": "MEDIUM"}
        ],
        "voice": "ananya",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-004",
        "suite_id": "suite-insurance-hi",
        "scenario": "Term Plan Nomination Confirmation Hindi",
        "language": "hi-IN",
        "reference_text": "आपके टर्म लाइफ प्लान के नॉमिनी का नाम सुनीता शर्मा सफलतापूर्वक दर्ज कर लिया गया है।",
        "critical_phrases": [
            {"text": "सुनीता शर्मा", "variants": ["sunita sharma"], "severity": "HIGH"},
            {"text": "टर्म लाइफ प्लान", "variants": ["term life plan"], "severity": "MEDIUM"}
        ],
        "voice": "ananya",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-005",
        "suite_id": "suite-insurance-hi",
        "scenario": "Credit Card Minimum Due Hindi",
        "language": "hi-IN",
        "reference_text": "आपके क्रेडिट कार्ड का न्यूनतम देय ₹1,850 है जो 18 नवंबर से पहले देय है।",
        "critical_phrases": [
            {"text": "₹1,850", "variants": ["1850", "1,850"], "severity": "CRITICAL"},
            {"text": "18 नवंबर", "variants": ["18 november"], "severity": "HIGH"}
        ],
        "voice": "ananya",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    }
]

def seed():
    print(f"Connecting to SvaraLens backend at {API_BASE}...")
    try:
        # Check health
        h = requests.get(f"{API_BASE}/health", timeout=5)
        h.raise_for_status()
        print(f"Backend status: {h.json()['status']} (mock_mode={h.json()['mock_mode']})")
    except Exception as e:
        print(f"Could not connect to backend at {API_BASE}. Make sure FastAPI is running on port 8000. Error: {e}")
        return False

    # Seed cases
    for case in DEMO_CASES:
        res = requests.post(f"{API_BASE}/cases", json=case)
        if res.status_code in (200, 201):
            print(f"✓ Seeded {case['id']}: {case['scenario']}")
        else:
            print(f"Case {case['id']} might already exist or responded {res.status_code}: {res.text}")

    # Generate initial run for TC-014 with injected truncation
    print("\nTriggering initial Timbre run for TC-014 with injected truncation...")
    r = requests.post(f"{API_BASE}/cases/TC-014/runs/generate?injected_fault=END_TRUNCATION")
    if r.status_code == 200:
        data = r.json()
        print(f"✓ Initial run created: {data['run_id']} with {data['findings_count']} findings.")
    else:
        print(f"Failed to generate initial run: {r.status_code} {r.text}")

    print("\n✓ Database seeding complete! Ready for demo.")
    return True

if __name__ == "__main__":
    seed()
