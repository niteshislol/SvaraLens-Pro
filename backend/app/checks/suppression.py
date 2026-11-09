from typing import Dict, Any, List, Optional
from ..text.normalize_hi import normalize_text_hindi

# Common Indic & Hinglish short conversational utterances, acknowledgments, and consent tokens
SMALL_UTTERANCE_TOKENS = [
    "हाँ", "हां", "जी", "जी हाँ", "जी हां", "अच्छा", "ठीक है",
    "सही है", "haan", "ji", "theek hai", "sahi hai", "achha", "okay",
    "यस", "नो", "yes", "no", "nahi", "नहीं"
]

def _tokenize_words(text: str) -> List[str]:
    return [t.strip('।,.-!?:;"\'()[]') for t in text.split() if t.strip('।,.-!?:;"\'()[]')]

def check_small_utterance_suppression(
    reference_text: str,
    transcript_text: str
) -> Optional[Dict[str, Any]]:
    """
    Detects Small Utterance Suppression (Section 4 of Gnani AI Research).
    Identifies short conversational tokens (consent, affirmation, acknowledgement)
    present in the reference/speaker text that were suppressed or omitted by the ASR decoder.
    """
    ref_norm = normalize_text_hindi(reference_text).lower()
    hyp_norm = normalize_text_hindi(transcript_text).lower()

    ref_words = set(_tokenize_words(ref_norm))
    hyp_words = set(_tokenize_words(hyp_norm))

    suppressed_tokens = []
    for token in SMALL_UTTERANCE_TOKENS:
        token_norm = normalize_text_hindi(token).lower()
        # Single word token
        if " " not in token_norm:
            if token_norm in ref_words and token_norm not in hyp_words:
                suppressed_tokens.append(token)
        else:
            # Multi-word phrase e.g. 'theek hai'
            if token_norm in ref_norm and token_norm not in hyp_norm:
                suppressed_tokens.append(token)

    if suppressed_tokens:
        tokens_str = ", ".join(f"'{t}'" for t in suppressed_tokens)
        return {
            "check_type": "SMALL_UTTERANCE_SUPPRESSION",
            "status": "WARN",
            "severity": "HIGH",
            "evidence": {
                "suppressed_tokens": suppressed_tokens,
                "count": len(suppressed_tokens),
                "explanation": (
                    f"Possible Small Utterance Suppression detected: Conversational affirmation/consent "
                    f"token(s) {tokens_str} present in reference text but absent from recognized transcript. "
                    f"Common vulnerability in LLM-augmented ASR decoders (Gnani Research Section 4)."
                )
            }
        }

    return None
