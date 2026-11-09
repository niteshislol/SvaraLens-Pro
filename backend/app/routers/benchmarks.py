from typing import Dict, Any, List
from fastapi import APIRouter

router = APIRouter(prefix="/benchmarks", tags=["benchmarks"])

@router.get("/matrix")
def get_benchmark_matrix() -> Dict[str, Any]:
    """
    Returns empirical Indic ASR benchmark dataset matrix based on Gnani AI's published research:
    'Benchmarking Indic ASR Models: A Technical Deep-Dive into WER, CER, and Indic Dataset Methodology'.
    
    Shows the performance drop across:
    1. Clean Studio Ceiling (KathBath Clean / FLEURS)
    2. Telephony PSTN 8kHz (KathBath Noisy)
    3. Rural Spontaneous Dialect (GramVaani)
    """
    datasets = [
        {
            "id": "kathbath_clean",
            "name": "KathBath Clean",
            "publisher": "Microsoft Research India",
            "description": "Studio-quality standard read speech (16kHz). Establishes theoretical accuracy ceiling.",
            "acoustic_profile": "Studio Clean 16kHz",
            "hours": "~1,700 hrs",
            "relevance": "Laboratory Baseline"
        },
        {
            "id": "kathbath_noisy",
            "name": "KathBath Noisy (Telephony PSTN)",
            "publisher": "Microsoft Research India",
            "description": "Telephony noise augmentation, G.711 compression, and background call-center noise.",
            "acoustic_profile": "PSTN 8kHz + Noise (18dB SNR)",
            "hours": "~1,700 hrs",
            "relevance": "Production Telephony & IVR"
        },
        {
            "id": "gramvaani",
            "name": "GramVaani Rural",
            "publisher": "IIT Bombay / GramVaani",
            "description": "Community radio calls from rural UP, Bihar, MP, Rajasthan. Dialectal spontaneous vernacular.",
            "acoustic_profile": "Acoustically Imperfect Dialectal",
            "hours": "~1,100 hrs",
            "relevance": "Tier 2/3 Vernacular Reality"
        },
        {
            "id": "mucs",
            "name": "MUCS Broadcast",
            "publisher": "IIT Madras",
            "description": "Multi-source broadcast and conversational speech across mixed acoustic conditions.",
            "acoustic_profile": "Broadcast / Field Recordings",
            "hours": "~200 hrs",
            "relevance": "Media & Semi-structured Audio"
        }
    ]

    model_scores = [
        {
            "model_id": "prisma-v3.0",
            "model_name": "Gnani Prisma v3.0",
            "provider": "Gnani AI",
            "architecture": "Frontier Acoustic-Phonetic",
            "scores": {
                "kathbath_clean": {"wer": 8.1, "cer": 4.2, "latency_ms": 180},
                "kathbath_noisy": {"wer": 14.8, "cer": 8.4, "latency_ms": 185},
                "gramvaani": {"wer": 21.2, "cer": 11.6, "latency_ms": 190},
                "mucs": {"wer": 12.3, "cer": 6.8, "latency_ms": 182}
            },
            "small_utterance_retention": "98.4%",
            "dialect_preservation_score": "95.1%",
            "hallucination_rate": "4.2%"
        },
        {
            "model_id": "prisma-v2.5",
            "model_name": "Gnani Prisma v2.5",
            "provider": "Gnani AI",
            "architecture": "Pure-Play Streaming Acoustic",
            "scores": {
                "kathbath_clean": {"wer": 10.4, "cer": 5.8, "latency_ms": 220},
                "kathbath_noisy": {"wer": 18.2, "cer": 10.1, "latency_ms": 225},
                "gramvaani": {"wer": 26.5, "cer": 14.2, "latency_ms": 230},
                "mucs": {"wer": 15.6, "cer": 8.7, "latency_ms": 222}
            },
            "small_utterance_retention": "96.2%",
            "dialect_preservation_score": "91.8%",
            "hallucination_rate": "7.5%"
        },
        {
            "model_id": "whisper-large-v3",
            "model_name": "OpenAI Whisper Large-v3",
            "provider": "OpenAI",
            "architecture": "Seq2Seq LLM-Augmented",
            "scores": {
                "kathbath_clean": {"wer": 11.2, "cer": 6.3, "latency_ms": 780},
                "kathbath_noisy": {"wer": 24.6, "cer": 15.2, "latency_ms": 820},
                "gramvaani": {"wer": 38.9, "cer": 22.4, "latency_ms": 890},
                "mucs": {"wer": 18.4, "cer": 10.9, "latency_ms": 795}
            },
            "small_utterance_retention": "72.1% (Suppression)",
            "dialect_preservation_score": "68.4% (Flattening)",
            "hallucination_rate": "14.8%"
        },
        {
            "model_id": "saaras-v1",
            "model_name": "Sarvam Saaras v1",
            "provider": "Sarvam AI",
            "architecture": "Indic Specialized",
            "scores": {
                "kathbath_clean": {"wer": 12.0, "cer": 6.9, "latency_ms": 290},
                "kathbath_noisy": {"wer": 21.5, "cer": 12.8, "latency_ms": 305},
                "gramvaani": {"wer": 31.4, "cer": 17.5, "latency_ms": 315},
                "mucs": {"wer": 17.1, "cer": 9.8, "latency_ms": 295}
            },
            "small_utterance_retention": "89.0%",
            "dialect_preservation_score": "84.2%",
            "hallucination_rate": "9.1%"
        }
    ]

    methodology = {
        "evaluation_rule": "NIST standard aggregate WER = sum(S+D+I)/sum(N)",
        "char_metric": "Unicode-NFC Abugida Normalized CER",
        "api_only": "All engines evaluated purely via production APIs with no offline CUDA trickery",
        "key_takeaway": "The benchmark gap: Models degrading significantly from KathBath to GramVaani are lab models, not production ready."
    }

    return {
        "datasets": datasets,
        "models": model_scores,
        "methodology": methodology
    }
