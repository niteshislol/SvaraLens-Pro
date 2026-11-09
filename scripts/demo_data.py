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
