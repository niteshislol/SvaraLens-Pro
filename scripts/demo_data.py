DEMO_SUITE = {
    "id": "suite-insurance-hi",
    "name": "Insurance Hindi Voice Test Suite",
    "description": "Pre-release Indic speech fidelity and regression suite covering insurance, banking reminders, and mandatory disclosures."
}

DEMO_CASES = [
    # 1. Signature Case
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
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    # 2. Hindi - Motor Policy
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
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    # 3. Hinglish - Health Claim
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
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    # 4. Hinglish - KYC
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
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    # 5. Hindi - Term Plan
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
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    # 6. Hindi - Credit Card
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
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    # 7. Hindi - Free-Look Period
    {
        "id": "TC-006",
        "suite_id": "suite-insurance-hi",
        "scenario": "Life Policy 15-Day Free-Look Notice",
        "language": "hi-IN",
        "reference_text": "यदि आप पॉलिसी नियमों से संतुष्ट नहीं हैं, तो 15 दिनों की फ्री-लुक अवधि के भीतर पूरा रिफंड प्राप्त कर सकते हैं।",
        "critical_phrases": [
            {"text": "15 दिनों", "variants": ["15 din", "पंद्रह दिन"], "severity": "HIGH"},
            {"text": "फ्री-लुक अवधि", "variants": ["free look period"], "severity": "HIGH"},
            {"text": "पूरा रिफंड", "variants": ["full refund"], "severity": "MEDIUM"}
        ],
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    # 8. Hinglish - Auto Debit Mandate
    {
        "id": "TC-007",
        "suite_id": "suite-insurance-hi",
        "scenario": "Auto-Debit Mandate Notification Hinglish",
        "language": "hinglish",
        "reference_text": "Aapka monthly SIP mandate ₹5,000 kal subah debit hone wala hai. Kripya bank balance check rakhein.",
        "critical_phrases": [
            {"text": "₹5,000", "variants": ["5000", "5,000"], "severity": "CRITICAL"},
            {"text": "SIP mandate", "variants": ["एसआईपी मैंडेट"], "severity": "HIGH"}
        ],
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    # 9. Hindi - Critical Illness Rider
    {
        "id": "TC-008",
        "suite_id": "suite-insurance-hi",
        "scenario": "Critical Illness Cover Endorsement Hindi",
        "language": "hi-IN",
        "reference_text": "आपकी बेस पॉलिसी में ₹10,00,000 का गंभीर बीमारी सुरक्षा कवर जोड़ दिया गया है।",
        "critical_phrases": [
            {"text": "₹10,00,000", "variants": ["10 lakh", "10,00,000"], "severity": "CRITICAL"},
            {"text": "गंभीर बीमारी सुरक्षा", "variants": ["critical illness"], "severity": "HIGH"}
        ],
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    # 10. Hinglish - Hospital Daily Cash
    {
        "id": "TC-009",
        "suite_id": "suite-insurance-hi",
        "scenario": "Hospital Cash Benefit Hinglish",
        "language": "hinglish",
        "reference_text": "Hospitalization ke dauran aapko ₹2,000 per day ka daily cash allowance milega maximum 30 days ke liye.",
        "critical_phrases": [
            {"text": "₹2,000", "variants": ["2000", "2,000"], "severity": "HIGH"},
            {"text": "daily cash allowance", "variants": ["दैनिक नकद भत्ता"], "severity": "HIGH"},
            {"text": "30 days", "variants": ["तीस दिन"], "severity": "MEDIUM"}
        ],
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "MEDIUM",
        "is_synthetic": 1
    },
    # 11. Hindi - Home Insurance Claim Settlement
    {
        "id": "TC-010",
        "suite_id": "suite-insurance-hi",
        "scenario": "Home Fire Claim Direct Transfer Hindi",
        "language": "hi-IN",
        "reference_text": "गृह क्षति दावे के ₹3,50,000 आपके पंजीकृत बैंक खाते में 24 घंटे में जमा कर दिए जाएंगे।",
        "critical_phrases": [
            {"text": "₹3,50,000", "variants": ["350000", "3,50,000"], "severity": "CRITICAL"},
            {"text": "पंजीकृत बैंक खाते", "variants": ["registered bank account"], "severity": "HIGH"},
            {"text": "24 घंटे", "variants": ["24 hours"], "severity": "MEDIUM"}
        ],
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    },
    # 12. Hinglish - No Claim Bonus
    {
        "id": "TC-011",
        "suite_id": "suite-insurance-hi",
        "scenario": "No Claim Bonus 50% Rollover Hinglish",
        "language": "hinglish",
        "reference_text": "Pichle saal koi claim na lene par aapko renewal premium par 50% No Claim Bonus discount diya gaya hai.",
        "critical_phrases": [
            {"text": "50% No Claim Bonus", "variants": ["50 percent NCB", "50% एनसीबी"], "severity": "HIGH"},
            {"text": "discount", "variants": ["छूट"], "severity": "MEDIUM"}
        ],
        "voice": "Nalini",
        "speed": 1.0,
        "channel": "standard",
        "severity": "HIGH",
        "is_synthetic": 1
    }
]
