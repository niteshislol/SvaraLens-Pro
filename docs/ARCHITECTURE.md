# SvaraLens Pro — System Architecture

## Overview
**SvaraLens Pro** is a pre-release Indic Voice QA Evidence & Regression Workbench designed to bridge conversational AI evaluations and voice speech engineering. It operates on the core principle:
> **"Every spoken defect becomes a reproducible test."**

---

## 1. High-Level Architecture Diagram

```
+------------------------------------------------------------------------------------+
|                                 FRONTEND TIER                                      |
|  React 18 + TypeScript + Vite + Tailwind CSS (Port 8000 / Proxy 5173)              |
|                                                                                    |
|  [Left Explorer]            [Center Stage]                  [Right Drawer]         |
|  - 30-Case Test Studio      - Multi-Model Arena (v3.0/v2.5) - Acoustic Radar (DSP) |
|  - Search & Dialect Filters - Dual-Track Canvas Player (A/B)- Defect Pin Manager   |
|  - CSV Importer & Exporter  - Dual-ASR Jury (Prisma v3/v2.5)- Capsule & Regression |
|  - Preset Templates         - Indic Token Diff Matrix       - Release Readiness    |
+------------------------------------------------------------------------------------+
                                    │  REST / JSON / Audio Stream
                                    ▼
+------------------------------------------------------------------------------------+
|                                 BACKEND TIER                                       |
|  FastAPI (Python 3.11/3.15) Service Layer                                          |
|                                                                                    |
|  • Routers: /cases, /runs, /findings, /reviews, /capsules, /analytics, /health     |
|  • Audio DSP Pipeline: 16kHz Normalization, Framing RMS, Peak dBFS, Clipping %,     |
|    Silence Intervals, Tail Energy Drop Truncation Corroborator                     |
|  • NLP & Alignment: jiwer (WER/CER), Devanagari normalizer, fuzzy token consensus  |
|  • Capsule Compiler: SHA-256 byte digest, 10-defect assertion engine, immutable spec|
|  • Regression Replay Engine: Multi-Track evaluation, Before/After assertion matrix  |
+------------------------------------------------------------------------------------+
              │                                                │
              ▼                                                ▼
+-----------------------------+               +--------------------------------------+
|       DATABASE TIER         |               |         EXTERNAL SERVICES            |
|  SQLite (PostgreSQL-ready)  |               |  Gnani Vachana Platform (LIVE API)   |
|  • test_cases (30 corpus)   |               |  https://api.vachana.ai              |
|  • runs & findings          |               |  • TTS: /api/v1/tts/inference        |
|  • defect_pins & reviews    |               |    - Timbre v3.0 (Expressive Neural) |
|  • capsules (immutable)     |               |    - Timbre v2.5 (Telephony IVR)     |
|  • regression_runs          |               |  • STT: /stt/v3                      |
|  • audit_events             |               |    - Prisma v3.0 (indic-auto)        |
|                             |               |    - Prisma v2.5 (Telephony 8kHz)    |
+-----------------------------+               +--------------------------------------+
```

---

## 2. Component Design Principles

### A. The Epistemic Boundary Rule
* A speech recognition transcript difference is an **alert / warning**, never standalone proof of incorrect pronunciation.
* Prisma transcription engines can make recognition errors.
* Therefore, automated checks flag anomalies as `SUSPECTED` or `WARN`. A defect only transitions to `HUMAN_CONFIRMED` after native-language listener review.

### B. Dual-ASR Consensus Engine
To minimize single-engine transcription bias, SvaraLens executes **Prisma v3.0** and **Prisma v2.5** in parallel:
* **Prisma v3.0** leverages sovereign Indian language models with dynamic `indic-auto` language detection and sub-200ms latency.
* **Prisma v2.5** serves as an acoustic telephony baseline.
* The system computes a normalized Levenshtein token consensus ratio. Disagreements between the two engines highlight phonetic ambiguities.

### C. The Voice Defect Capsule
A Voice Defect Capsule is an immutable contract storing:
1. Ground-truth reference script and mandatory critical tokens.
2. Original failing audio file and its SHA-256 digest computed from raw disk bytes.
3. Dual-ASR transcripts and acoustic metrics.
4. Reviewer-pinned timestamps and defect classification.
5. Structured assertion rules that replacement audio must satisfy to prove regression resolution.
