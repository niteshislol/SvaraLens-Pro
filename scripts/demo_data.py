DEMO_SUITE = {
    "id": "suite-insurance-hi",
    "name": "Insurance Hindi Voice Test Suite",
    "description": "Pre-release Indic speech fidelity and regression suite covering insurance, banking reminders, and mandatory disclosures."
}

DEMO_CASES = [
    # =========================================================================
    # A. 10 HINDI SPEECH OUTPUTS (hi-IN)
    # =========================================================================
    {
        "id": "TC-001",
        "suite_id": "suite-insurance-hi",
        "scenario": "Motor Insurance Policy Expiry Notice",
        "title": "Motor Insurance Policy Expiry Notice",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "आपकी कार बीमा पॉलिसी 25 दिसंबर को समाप्त हो रही है। बिना रुकावट कवरेज के लिए तुरंत रिन्यू करें।",
        "critical_phrases": [
            {"text": "कार बीमा पॉलिसी", "variants": ["car insurance policy"], "severity": "HIGH"},
            {"text": "25 दिसंबर", "variants": ["25 december", "पच्चीस दिसंबर"], "severity": "HIGH"},
            {"text": "तुरंत रिन्यू", "variants": ["renew immediately"], "severity": "MEDIUM"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-004",
        "suite_id": "suite-insurance-hi",
        "scenario": "Term Plan Nomination Confirmation Hindi",
        "title": "Term Plan Nomination Confirmation Hindi",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "आपके टर्म लाइफ प्लान के नॉमिनी का नाम सुनीता शर्मा सफलतापूर्वक दर्ज कर लिया गया है।",
        "critical_phrases": [
            {"text": "सुनीता शर्मा", "variants": ["sunita sharma"], "severity": "HIGH"},
            {"text": "टर्म लाइफ प्लान", "variants": ["term life plan"], "severity": "MEDIUM"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-005",
        "suite_id": "suite-insurance-hi",
        "scenario": "Credit Card Minimum Due Hindi",
        "title": "Credit Card Minimum Due Hindi",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "आपके क्रेडिट कार्ड का न्यूनतम देय ₹1,850 है जो 18 नवंबर से पहले देय है।",
        "critical_phrases": [
            {"text": "₹1,850", "variants": ["1850", "1,850", "एक हज़ार आठ सौ पचास"], "severity": "CRITICAL"},
            {"text": "18 नवंबर", "variants": ["18 november", "अठारह नवंबर"], "severity": "HIGH"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-006",
        "suite_id": "suite-insurance-hi",
        "scenario": "Life Policy 15-Day Free-Look Notice",
        "title": "Life Policy 15-Day Free-Look Notice",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "यदि आप पॉलिसी नियमों से संतुष्ट नहीं हैं, तो 15 दिनों की फ्री-लुक अवधि के भीतर पूरा रिफंड प्राप्त कर सकते हैं।",
        "critical_phrases": [
            {"text": "15 दिनों", "variants": ["15 din", "पंद्रह दिन"], "severity": "HIGH"},
            {"text": "फ्री-लुक अवधि", "variants": ["free look period"], "severity": "HIGH"},
            {"text": "पूरा रिफंड", "variants": ["full refund"], "severity": "MEDIUM"}
        ],
        "voice": "Kalpana",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-008",
        "suite_id": "suite-insurance-hi",
        "scenario": "Critical Illness Cover Endorsement Hindi",
        "title": "Critical Illness Cover Endorsement Hindi",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "आपकी बेस पॉलिसी में ₹10,00,000 का गंभीर बीमारी सुरक्षा कवर जोड़ दिया गया है।",
        "critical_phrases": [
            {"text": "₹10,00,000", "variants": ["10 lakh", "दस लाख", "10,00,000"], "severity": "CRITICAL"},
            {"text": "गंभीर बीमारी सुरक्षा", "variants": ["critical illness"], "severity": "HIGH"}
        ],
        "voice": "Prakash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-010",
        "suite_id": "suite-insurance-hi",
        "scenario": "Home Fire Claim Direct Transfer Hindi",
        "title": "Home Fire Claim Direct Transfer Hindi",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "गृह क्षति दावे के ₹3,50,000 आपके पंजीकृत बैंक खाते में 24 घंटे में जमा कर दिए जाएंगे।",
        "critical_phrases": [
            {"text": "₹3,50,000", "variants": ["350000", "3,50,000", "तीन लाख पचास हज़ार"], "severity": "CRITICAL"},
            {"text": "पंजीकृत बैंक खाते", "variants": ["registered bank account"], "severity": "HIGH"},
            {"text": "24 घंटे", "variants": ["24 hours", "चौबीस घंटे"], "severity": "MEDIUM"}
        ],
        "voice": "Avinash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-012",
        "suite_id": "suite-insurance-hi",
        "scenario": "Senior Citizen Health Care OPD Rider",
        "title": "Senior Citizen Health Care OPD Rider",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "वरिष्ठ नागरिक स्वास्थ्य योजना में वार्षिक ₹15,000 तक ओपीडी परामर्श और दवा खर्च शामिल हैं।",
        "critical_phrases": [
            {"text": "₹15,00,000", "variants": ["₹15,000", "15000", "पंद्रह हज़ार"], "severity": "HIGH"},
            {"text": "ओपीडी परामर्श", "variants": ["OPD consultation"], "severity": "HIGH"}
        ],
        "voice": "Lakshmi",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-014",
        "suite_id": "suite-insurance-hi",
        "scenario": "Insurance Premium Reminder (Demo Signature Case)",
        "title": "Insurance Premium Reminder (Demo Signature Case)",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "आपका अगला प्रीमियम भुगतान ₹4,250 12 नवंबर को देय है। 150 रुपये का विलंब शुल्क लग सकता है।",
        "critical_phrases": [
            {"text": "₹4,250", "variants": ["4,250", "4250", "चार हज़ार दो सौ पचास"], "severity": "HIGH"},
            {"text": "12 नवंबर", "variants": ["12 november", "बारह नवंबर"], "severity": "HIGH"},
            {"text": "विलंब शुल्क", "variants": ["late fee", "late charge", "150 रुपये"], "severity": "CRITICAL"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-016",
        "suite_id": "suite-insurance-hi",
        "scenario": "Pension Annuity Monthly Disbursement Notice",
        "title": "Pension Annuity Monthly Disbursement Notice",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "आपकी मासिक पेंशन वार्षिकी ₹18,200 पहली तारीख को सीधे बैंक खाते में जमा हो जाएगी।",
        "critical_phrases": [
            {"text": "₹18,200", "variants": ["18200", "18,200", "अठारह हज़ार दो सौ"], "severity": "CRITICAL"},
            {"text": "मासिक पेंशन", "variants": ["monthly pension"], "severity": "HIGH"}
        ],
        "voice": "Kalpana",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-018",
        "suite_id": "suite-insurance-hi",
        "scenario": "Critical Medical Emergency Cash Advance",
        "title": "Critical Medical Emergency Cash Advance",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "आपातकालीन चिकित्सा सहायता हेतु ₹50,000 की अग्रिम राशि अस्पताल डेस्क पर स्वीकृत कर दी गई है।",
        "critical_phrases": [
            {"text": "₹50,000", "variants": ["50000", "पचास हज़ार"], "severity": "CRITICAL"},
            {"text": "अग्रिम राशि", "variants": ["cash advance"], "severity": "HIGH"}
        ],
        "voice": "Prakash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },

    # =========================================================================
    # B. 10 HINGLISH SPEECH OUTPUTS (hinglish)
    # =========================================================================
    {
        "id": "TC-002",
        "suite_id": "suite-insurance-hi",
        "scenario": "Health Claim Pre-Authorization Hinglish",
        "title": "Health Claim Pre-Authorization Hinglish",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Aapka health claim pre-authorization amount ₹75,000 approve ho gaya hai. Network hospital me cashless facility available hai.",
        "critical_phrases": [
            {"text": "₹75,000", "variants": ["75000", "75,000 rupees"], "severity": "CRITICAL"},
            {"text": "cashless facility", "variants": ["कैशलेस सुविधा"], "severity": "HIGH"},
            {"text": "pre-authorization", "variants": ["प्री-ऑथराइजेशन"], "severity": "HIGH"}
        ],
        "voice": "Avinash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-003",
        "suite_id": "suite-insurance-hi",
        "scenario": "KYC Verification Reminder Hinglish",
        "title": "KYC Verification Reminder Hinglish",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Kripya apna mandatory KYC verification 3 days ke andar complete karein taaki payouts me delay na ho.",
        "critical_phrases": [
            {"text": "KYC verification", "variants": ["केवाईसी वेरिफिकेशन"], "severity": "HIGH"},
            {"text": "3 days", "variants": ["teen din", "3 दिन"], "severity": "MEDIUM"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-007",
        "suite_id": "suite-insurance-hi",
        "scenario": "Auto-Debit Mandate Notification Hinglish",
        "title": "Auto-Debit Mandate Notification Hinglish",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Aapka monthly SIP mandate ₹5,000 kal subah debit hone wala hai. Kripya bank balance check rakhein.",
        "critical_phrases": [
            {"text": "₹5,000", "variants": ["5000", "5,000"], "severity": "CRITICAL"},
            {"text": "SIP mandate", "variants": ["एसआईपी मैंडेट"], "severity": "HIGH"}
        ],
        "voice": "Avinash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-009",
        "suite_id": "suite-insurance-hi",
        "scenario": "Hospital Cash Benefit Hinglish",
        "title": "Hospital Cash Benefit Hinglish",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Hospitalization ke dauran aapko ₹2,000 per day ka daily cash allowance milega maximum 30 days ke liye.",
        "critical_phrases": [
            {"text": "₹2,000", "variants": ["2000", "2,000"], "severity": "HIGH"},
            {"text": "daily cash allowance", "variants": ["दैनिक नकद भत्ता"], "severity": "HIGH"},
            {"text": "30 days", "variants": ["तीस दिन"], "severity": "MEDIUM"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "MEDIUM",
        "is_synthetic": 1
    },
    {
        "id": "TC-011",
        "suite_id": "suite-insurance-hi",
        "scenario": "No Claim Bonus 50% Rollover Hinglish",
        "title": "No Claim Bonus 50% Rollover Hinglish",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Pichle saal koi claim na lene par aapko renewal premium par 50% No Claim Bonus discount diya gaya hai.",
        "critical_phrases": [
            {"text": "50% No Claim Bonus", "variants": ["50 percent NCB", "50% एनसीबी"], "severity": "HIGH"},
            {"text": "discount", "variants": ["छूट"], "severity": "MEDIUM"}
        ],
        "voice": "Avinash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-015",
        "suite_id": "suite-insurance-hi",
        "scenario": "UPI Mandate Auto-Debit Failure",
        "title": "UPI Mandate Auto-Debit Failure",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Aapka UPI AutoPay mandate ₹1,200 insufficient balance ki wajah se reject ho gaya hai. Late fee se bachne ke liye manual pay karein.",
        "critical_phrases": [
            {"text": "₹1,200", "variants": ["1200", "बारह सौ"], "severity": "CRITICAL"},
            {"text": "UPI AutoPay", "variants": ["यूपीआई ऑटोपे"], "severity": "HIGH"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-017",
        "suite_id": "suite-insurance-hi",
        "scenario": "Comprehensive Car Insurance Zero Dep Add-on",
        "title": "Comprehensive Car Insurance Zero Dep Add-on",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Aapki car insurance policy me Zero Depreciation add-on include kar diya gaya hai. Bumper to bumper 100% claim coverage milega.",
        "critical_phrases": [
            {"text": "Zero Depreciation", "variants": ["जीरो डेप्रिसिएशन", "Zero Dep"], "severity": "HIGH"},
            {"text": "100% claim coverage", "variants": ["सौ प्रतिशत कवरेज"], "severity": "HIGH"}
        ],
        "voice": "Avinash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-019",
        "suite_id": "suite-insurance-hi",
        "scenario": "Travel Insurance Flight Delay Reimbursement",
        "title": "Travel Insurance Flight Delay Reimbursement",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Flight 6 ghante se zyada delay hone par aap ₹4,000 meal allowance claim kar sakte hain boarding pass upload karke.",
        "critical_phrases": [
            {"text": "₹4,000", "variants": ["4000", "चार हज़ार"], "severity": "HIGH"},
            {"text": "meal allowance", "variants": ["मील अलाउंस"], "severity": "MEDIUM"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "MEDIUM",
        "is_synthetic": 1
    },
    {
        "id": "TC-024",
        "suite_id": "suite-insurance-hi",
        "scenario": "Loan EMI Bounce & Cheque Return Alert",
        "title": "Loan EMI Bounce & Cheque Return Alert",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Aapki personal loan EMI of ₹8,450 bounce ho gayi hai. Cheque return charges of ₹450 apply honge.",
        "critical_phrases": [
            {"text": "₹8,450", "variants": ["8450", "8,450"], "severity": "CRITICAL"},
            {"text": "₹450", "variants": ["450", "चार सौ पचास"], "severity": "HIGH"},
            {"text": "cheque return charges", "variants": ["चेक रिटर्न चार्ज"], "severity": "HIGH"}
        ],
        "voice": "Avinash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-025",
        "suite_id": "suite-insurance-hi",
        "scenario": "Credit Card Reward Points Expiry Notification",
        "title": "Credit Card Reward Points Expiry Notification",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Aapke 12,500 accumulated reward points worth ₹3,125 is mahine expire ho rahe hain. Vouchers ke liye turant redeem karein.",
        "critical_phrases": [
            {"text": "12,500", "variants": ["12500", "बारह हज़ार पाँच सौ"], "severity": "HIGH"},
            {"text": "₹3,125", "variants": ["3125", "3,125"], "severity": "CRITICAL"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    },

    # =========================================================================
    # C. 5 CRITICAL-INFORMATION TESTS (Financial Disclosures & High-Risk)
    # =========================================================================
    {
        "id": "TC-021",
        "suite_id": "suite-insurance-hi",
        "scenario": "Term Life Maturity Notice",
        "title": "Term Life Maturity Notice",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "नमस्ते, आपकी टर्म लाइफ पॉलिसी 15 दिसंबर को मैच्योर हो रही है। क्लेम पेआउट ₹25,00,000 आपके खाते में सीधे जमा किया जाएगा।",
        "critical_phrases": [
            {"text": "15 दिसंबर", "variants": ["15 december", "पंद्रह दिसंबर"], "severity": "HIGH"},
            {"text": "₹25,00,000", "variants": ["25 lakh", "पच्चीस लाख रुपये", "25,00,000"], "severity": "CRITICAL"},
            {"text": "क्लेम पेआउट", "variants": ["claim payout"], "severity": "HIGH"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-026",
        "suite_id": "suite-insurance-hi",
        "scenario": "Mutual Fund SIP ECS Stop Confirmation",
        "title": "Mutual Fund SIP ECS Stop Confirmation",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Aapki request par monthly SIP amount ₹10,000 ka auto-debit 30 November se stop kar diya gaya hai.",
        "critical_phrases": [
            {"text": "₹10,000", "variants": ["10000", "10,000", "दस हज़ार"], "severity": "CRITICAL"},
            {"text": "30 November", "variants": ["30th november", "तीस नवंबर"], "severity": "HIGH"},
            {"text": "auto-debit", "variants": ["ऑटो डेबिट"], "severity": "HIGH"}
        ],
        "voice": "Avinash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-027",
        "suite_id": "suite-insurance-hi",
        "scenario": "Home Loan Foreclosure Outstanding Notice",
        "title": "Home Loan Foreclosure Outstanding Notice",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "गृह ऋण बंद करने हेतु कुल देय राशि ₹18,45,200 है। एनओसी प्राप्त करने के लिए शाखा में मूल दस्तावेज जमा करें।",
        "critical_phrases": [
            {"text": "₹18,45,200", "variants": ["1845200", "18,45,200"], "severity": "CRITICAL"},
            {"text": "एनओसी प्राप्त करने", "variants": ["NOC"], "severity": "HIGH"}
        ],
        "voice": "Prakash",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-028",
        "suite_id": "suite-insurance-hi",
        "scenario": "Fixed Deposit Premature Withdrawal Penalty Notice",
        "title": "Fixed Deposit Premature Withdrawal Penalty Notice",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "समय पूर्व सावधि जमा निकासी पर 1% ब्याज कटौती लागू होगी। शुद्ध देय राशि ₹1,98,000 होगी।",
        "critical_phrases": [
            {"text": "1% ब्याज कटौती", "variants": ["one percent penalty", "1% penalty"], "severity": "CRITICAL"},
            {"text": "₹1,98,000", "variants": ["198000", "1,98,000", "एक लाख अठानवे हज़ार"], "severity": "CRITICAL"}
        ],
        "voice": "Kalpana",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-029",
        "suite_id": "suite-insurance-hi",
        "scenario": "Grace Period Policy Cancellation Warning",
        "title": "Grace Period Policy Cancellation Warning",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "30 दिन की रियायती अवधि 28 फरवरी को समाप्त होगी। भुगतान न होने पर बीमा सुरक्षा स्वतः रद्द हो जाएगी।",
        "critical_phrases": [
            {"text": "30 दिन की रियायती अवधि", "variants": ["grace period of 30 days"], "severity": "CRITICAL"},
            {"text": "28 फरवरी", "variants": ["28 february", "अट्ठाइस फरवरी"], "severity": "HIGH"},
            {"text": "स्वतः रद्द", "variants": ["automatically cancelled"], "severity": "CRITICAL"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },

    # =========================================================================
    # D. 5 AUDIO-INTEGRITY TESTS (DSP Acoustic Distortion Stress Tests)
    # =========================================================================
    {
        "id": "TC-020",
        "suite_id": "suite-insurance-hi",
        "scenario": "End-of-Speech Truncation Abrupt Drop Stress-Test",
        "title": "End-of-Speech Truncation Abrupt Drop Stress-Test",
        "language": "hi-IN",
        "dialect": "standard",
        "reference_text": "महत्वपूर्ण सूचना: किसी भी अनधिकृत लेनदेन की स्थिति में तुरंत टोल फ्री नंबर पर संपर्क करें।",
        "critical_phrases": [
            {"text": "महत्वपूर्ण सूचना", "variants": ["important notice"], "severity": "HIGH"},
            {"text": "टोल फ्री नंबर", "variants": ["toll free number"], "severity": "CRITICAL"}
        ],
        "voice": "Shivani",
        "tts_model": "timbre-v3.0",
        "speed": 1.0,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "CRITICAL",
        "is_synthetic": 1
    },
    {
        "id": "TC-022",
        "suite_id": "suite-insurance-hi",
        "scenario": "Telephony 8kHz Narrowband Acoustic Clipping Stress-Test",
        "title": "Telephony 8kHz Narrowband Acoustic Clipping Stress-Test",
        "language": "hi-IN",
        "dialect": "telephony",
        "reference_text": "बैंक सत्यापन कोड 849201 है। यह ओटीपी अगले 5 मिनट के लिए मान्य है, किसी से साझा न करें।",
        "critical_phrases": [
            {"text": "849201", "variants": ["84 92 01"], "severity": "CRITICAL"},
            {"text": "5 मिनट", "variants": ["five minutes", "पाँच मिनट"], "severity": "HIGH"}
        ],
        "voice": "Nalini",
        "tts_model": "timbre-v2.5",
        "speed": 1.0,
        "channel": "tel_8k",
        "sample_rate": 8000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-023",
        "suite_id": "suite-insurance-hi",
        "scenario": "High-Latency Long Silence Telephony Drop",
        "title": "High-Latency Long Silence Telephony Drop",
        "language": "hi-IN",
        "dialect": "telephony",
        "reference_text": "कृपया लाइन पर बने रहें, हम आपके दावे की स्थिति की जांच कर रहे हैं। प्रतीक्षा करने के लिए धन्यवाद।",
        "critical_phrases": [
            {"text": "लाइन पर बने रहें", "variants": ["stay on line"], "severity": "MEDIUM"},
            {"text": "दावे की स्थिति", "variants": ["claim status"], "severity": "HIGH"}
        ],
        "voice": "Deepak",
        "tts_model": "timbre-v2.5",
        "speed": 1.0,
        "channel": "tel_8k",
        "sample_rate": 8000,
        "severity": "HIGH",
        "is_synthetic": 1
    },
    {
        "id": "TC-013",
        "suite_id": "suite-insurance-hi",
        "scenario": "Fast Conversational Pace Telephony IVR Cadence Test",
        "title": "Fast Conversational Pace Telephony IVR Cadence Test",
        "language": "hi-IN",
        "dialect": "telephony",
        "reference_text": "मुख्य मेनू के लिए एक दबाएं, ग्राहक प्रतिनिधि से बात करने के लिए नौ दबाएं।",
        "critical_phrases": [
            {"text": "एक दबाएं", "variants": ["press 1"], "severity": "HIGH"},
            {"text": "नौ दबाएं", "variants": ["press 9"], "severity": "HIGH"}
        ],
        "voice": "Nalini",
        "tts_model": "timbre-v2.5",
        "speed": 1.15,
        "channel": "tel_8k",
        "sample_rate": 8000,
        "severity": "MEDIUM",
        "is_synthetic": 1
    },
    {
        "id": "TC-030",
        "suite_id": "suite-insurance-hi",
        "scenario": "Rapid High-Density Disclaimers Speech Rate Test",
        "title": "Rapid High-Density Disclaimers Speech Rate Test",
        "language": "hinglish",
        "dialect": "conversational",
        "reference_text": "Insurance is the subject matter of solicitation. Kripya policy terms and conditions ko dhyan se padhein.",
        "critical_phrases": [
            {"text": "subject matter of solicitation", "variants": ["सॉलिसिटेशन का विषय"], "severity": "HIGH"},
            {"text": "terms and conditions", "variants": ["नियम और शर्तें"], "severity": "MEDIUM"}
        ],
        "voice": "Avinash",
        "tts_model": "timbre-v3.0",
        "speed": 1.2,
        "channel": "standard",
        "sample_rate": 16000,
        "severity": "HIGH",
        "is_synthetic": 1
    }
]
