from typing import Dict, Any, List, Optional
from ..text.normalize_hi import normalize_text_hindi

# Known pairs of (colloquial/informal spoken form, formal/literary standardized form)
REGISTER_PAIRS = [
    ("उनको", "उन्हें", "Hindi third-person objective"),
    ("unko", "unhe", "Hinglish third-person objective"),
    ("तेरेको", "आपको", "Colloquial Mumbai/Delhi Hindi pronoun"),
    ("tereko", "aapko", "Colloquial Mumbai/Delhi Hindi pronoun"),
    ("मेरेको", "मुझे", "Colloquial Mumbai/Delhi Hindi pronoun"),
    ("mereko", "mujhe", "Colloquial Mumbai/Delhi Hindi pronoun"),
    ("अवनुंग", "अवरगल", "Colloquial Tamil dialect shift (avanunga -> avargal)"),
    ("avanunga", "avargal", "Colloquial Tamil dialect shift"),
    ("avanga", "avargal", "Colloquial Tamil honorific inflation"),
    ("बोल दो", "बताइए", "Colloquial Hindi imperative to formal polite imperative")
]

def _tokenize_words(text: str) -> List[str]:
    return [t.strip('।,.-!?:;"\'()[]') for t in text.split() if t.strip('।,.-!?:;"\'()[]')]

def check_dialect_register_inflation(
    reference_text: str,
    transcript_text: str
) -> Optional[Dict[str, Any]]:
    """
    Detects Dialect Flattening & Register Inflation (Section 4 of Gnani AI Research).
    Identifies when an ASR system alters what the speaker said to match written or formal standard register.
    """
    ref_norm = normalize_text_hindi(reference_text).lower()
    hyp_norm = normalize_text_hindi(transcript_text).lower()

    ref_words = set(_tokenize_words(ref_norm))
    hyp_words = set(_tokenize_words(hyp_norm))

    detected_replacements = []

    for colloquial, formal, note in REGISTER_PAIRS:
        c_norm = normalize_text_hindi(colloquial).lower()
        f_norm = normalize_text_hindi(formal).lower()

        # Check single word or multiword
        if " " not in c_norm and " " not in f_norm:
            if c_norm in ref_words and f_norm in hyp_words and c_norm not in hyp_words:
                detected_replacements.append({
                    "spoken_colloquial": colloquial,
                    "transcribed_formal": formal,
                    "description": note
                })
        else:
            if c_norm in ref_norm and f_norm in hyp_norm and c_norm not in hyp_norm:
                detected_replacements.append({
                    "spoken_colloquial": colloquial,
                    "transcribed_formal": formal,
                    "description": note
                })

    if detected_replacements:
        pairs_str = ", ".join(f"'{d['spoken_colloquial']}' → '{d['transcribed_formal']}'" for d in detected_replacements)
        return {
            "check_type": "DIALECT_REGISTER_INFLATION",
            "status": "WARN",
            "severity": "MEDIUM",
            "evidence": {
                "replacements": detected_replacements,
                "explanation": (
                    f"Possible Dialect Flattening / Register Normalization detected: Spoken conversational form(s) {pairs_str} "
                    f"were artificially converted to formal written register. This alters speaker intent and emotional register (Gnani Research Section 4)."
                )
            }
        }

    return None
