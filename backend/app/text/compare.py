import re
from typing import List, Dict, Any, Tuple
import jiwer
from rapidfuzz import fuzz
from .normalize_hi import normalize_text_hindi

def compute_wer_cer(reference: str, transcript: str) -> Dict[str, Any]:
    """
    Computes WER and CER on normalized text using jiwer 4.0+.
    """
    ref_norm = normalize_text_hindi(reference)
    hyp_norm = normalize_text_hindi(transcript)

    if not ref_norm and not hyp_norm:
        return {"wer": 0.0, "cer": 0.0, "insertions": 0, "deletions": 0, "substitutions": 0, "ref_norm": "", "hyp_norm": ""}

    if not ref_norm and hyp_norm:
        return {"wer": 1.0, "cer": 1.0, "insertions": len(hyp_norm.split()), "deletions": 0, "substitutions": 0, "ref_norm": "", "hyp_norm": hyp_norm}

    if ref_norm and not hyp_norm:
        return {"wer": 1.0, "cer": 1.0, "insertions": 0, "deletions": len(ref_norm.split()), "substitutions": 0, "ref_norm": ref_norm, "hyp_norm": ""}

    word_out = jiwer.process_words(ref_norm, hyp_norm)
    char_out = jiwer.process_characters(ref_norm, hyp_norm)

    return {
        "wer": round(float(word_out.wer), 4),
        "cer": round(float(char_out.cer), 4),
        "insertions": int(word_out.insertions),
        "deletions": int(word_out.deletions),
        "substitutions": int(word_out.substitutions),
        "ref_norm": ref_norm,
        "hyp_norm": hyp_norm
    }

def match_single_phrase(phrase: str, variants: List[str], hyp_norm: str, min_ratio: float = 85.0) -> Tuple[bool, float, str]:
    """
    Check exact normalised match, then variants, then rapidfuzz partial_ratio >= min_ratio.
    Returns: (is_matched, score, match_type)
    """
    phrase_norm = normalize_text_hindi(phrase)
    
    # 1. Exact normalized substring match
    if phrase_norm and phrase_norm in hyp_norm:
        return True, 100.0, "exact"

    # 2. Variant list matching
    for var in variants:
        var_norm = normalize_text_hindi(var)
        if var_norm and var_norm in hyp_norm:
            return True, 100.0, f"variant ({var})"

    # 3. Rapidfuzz partial ratio on phrase and variants
    best_score = float(fuzz.partial_ratio(phrase_norm, hyp_norm)) if phrase_norm and hyp_norm else 0.0
    best_variant = "primary"

    for var in variants:
        var_norm = normalize_text_hindi(var)
        if var_norm and hyp_norm:
            v_score = float(fuzz.partial_ratio(var_norm, hyp_norm))
            if v_score > best_score:
                best_score = v_score
                best_variant = var

    if best_score >= min_ratio:
        return True, round(best_score, 1), f"fuzzy ({best_variant})"

    return False, round(best_score, 1), "none"

def split_sentences(text: str) -> List[str]:
    """Split text into sentences by punctuation (। , . , ? , ! , newlines)."""
    sentences = [s.strip() for s in re.split(r'[।\.\?!;\n]+', text) if s.strip()]
    return sentences if sentences else [text.strip()]

def evaluate_last_sentence_match(reference: str, transcript: str) -> Dict[str, Any]:
    """
    Per section 2.6 of Master Build Document:
    Split reference into sentences.
    Calculate last sentence best-match score against the transcript and transcript length ratio.
    """
    ref_norm = normalize_text_hindi(reference)
    hyp_norm = normalize_text_hindi(transcript)

    sentences = split_sentences(reference)
    last_sentence = sentences[-1] if sentences else reference
    last_sent_norm = normalize_text_hindi(last_sentence)

    # Score last sentence against transcript
    last_score = float(fuzz.partial_ratio(last_sent_norm, hyp_norm)) if last_sent_norm and hyp_norm else 0.0

    # Transcript length ratio (character length)
    ref_len = len(ref_norm)
    hyp_len = len(hyp_norm)
    length_ratio = round(hyp_len / max(ref_len, 1), 3)

    return {
        "last_sentence": last_sentence,
        "last_sentence_norm": last_sent_norm,
        "match_score": round(last_score, 1),
        "transcript_length_ratio": length_ratio,
        "is_text_truncation_candidate": bool(last_score < 60.0 and length_ratio < 0.85)
    }
