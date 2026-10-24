# KhabarLens: Non-Blocking Assumptions

This document lists design and environment assumptions made based on the specification and verified live documentation.

---

### 1. Audio Transcoding & ffmpeg
* **Finding:** Terminal check confirmed `ffmpeg` is not installed on PATH on this Windows system.
* **Assumption:** Sarvam Saaras v3/v4 natively accepts `audio/webm;codecs=opus` (Chrome/Firefox/Edge) and `audio/mp4` (Safari), as well as WAV, MP3, AAC, FLAC, and OGG according to verified live documentation.
* **Action:** Audio from `MediaRecorder` will be passed directly to Saaras with its genuine MIME type. If an unsupported codec is ever encountered, backend can use an optional ffmpeg wrapper if installed, but normal browser voice recordings do not require local ffmpeg. The README will document this clearly.

### 2. Sarvam Vision Image Formats
* **Finding:** Sarvam Doc-AI (`POST /doc-ai/v1/job/digitise`) natively accepts single `.jpg`, `.jpeg`, and `.png` image files directly as multipart `file`.
* **Assumption:** No manual conversion of images to PDF or ZIP is necessary for single newspaper photographs. Pillow will be used on the backend to validate image dimensions (at least 600px short edge) and downscale to max 3000px long edge as specified in Section 9.1.

### 3. Model IDs
* **LLM:** `sarvam-105b` (or `sarvam-105b-conversations`).
* **STT:** `saaras:v3` (also compatible with `saaras:v4`).
* **TTS:** `bulbul:v3` (with default speaker `shubh` for Hindi/English, and language-specific voices configured in `TTS_SPEAKERS`).
* **Translate:** `sarvam-translate:v1` for full 23-language support; `mayura:v1` for colloquial modes or auto-detection.

### 4. Tavily Search Filtering
* **Finding:** Tavily Search supports `topic: "news"` and absolute date filters `start_date` and `end_date` in `YYYY-MM-DD` format.
* **Assumption:** If Tavily rejects date parameters on certain account tiers, the adapter will catch the error and retry without date filters to guarantee search results.

### 5. Indic Typography & Fallbacks
* **Assumption:** Google Fonts `Noto Sans` and Indic font families (`Noto Sans Devanagari`, `Noto Sans Bengali`, `Noto Sans Tamil`, etc.) will be dynamically loaded in `index.html` with `dir="auto"` on text containers to correctly handle LTR and RTL (Urdu) scripts.
