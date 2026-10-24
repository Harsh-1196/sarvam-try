# KhabarLens Implementation Status

This document contains the comprehensive audit and operational verification of all KhabarLens capabilities across backend services, external AI adapters (Sarvam Doc AI, Sarvam-105B, Sarvam Translate, Saaras STT, Bulbul TTS, Tavily Search), and the responsive React frontend.

---

## 1. Feature Status Matrix

| Feature | Current Status | Required Action / Notes |
|---|---|---|
| **Newspaper image upload** | **Working** | Validates MIME (`image/jpeg`, `image/png`, `image/webp`), size (50KB–10MB), and dimensions (300px–8000px). Supports drag-and-drop, file browsing, live camera viewfinder modal with stream switching, and mobile camera capture (`capture="environment"`). |
| **Sarvam Vision OCR** | **Working** | Uses Sarvam Doc AI async polling (`/doc-ai/v1/job`), extracting layout blocks, coordinates, tags, reading order, and Markdown. Robustly falls back to heuristic OCR if layout parsing fails. Newspaper date parser detects Hindi/English textual and numeric publication dates. |
| **Headline extraction & selection** | **Working** | Heuristic ranking of headlines based on font bounding boxes, position, and Sarvam LID language detection. User selects directly from clean candidate cards (editable headline textarea removed for streamlined single-click selection). |
| **Tavily news retrieval (5 articles)** | **Working** | Queries Tavily API with `include_images=True` for up to 5 articles. Retrieves title, publisher, URL, publication date, raw content, language, and article preview images. In-memory caching per headline prevents duplicate queries. |
| **Article content extraction** | **Working** | Extracts `raw_content` if available, falling back to `content`. Distinguishes full text from short snippets (`snippet_only=True` if under 200 chars), with clear badge indicator in the UI. |
| **Story-specific context collection** | **Working** | Normalizes URLs, clusters articles using 3-gram MinHash / Jaccard similarity, and assigns stable source IDs (`S0`–`S4`). Persisted in an in-memory session registry (`app.session`) for the lifetime of the story session and used directly by Q&A. |
| **Sarvam-105B structured story generation** | **Working** | Prompts `sarvam-105b-conversations` in English using a strict JSON schema. Enforces strict evidence linkage (`source_ids`), distinguishes event dates from publication dates, and structures timelines, perspectives, agreements, differences, and facts. |
| **Output validation & citation enforcement** | **Working** | Validates against Pydantic models. Verifies every quote in source text using NFKC normalization and zero-width stripping (>= 20 chars). Enforces valid source IDs and date temporal bounds. Automatically downgrades manufactured single-cluster conflicts to "Sources broadly agree". Auto-repairs malformed JSON. |
| **Animated event timeline** | **Working** | Chronological event cards with entrance animations, interactive card expansion, source reference badges (`S1`, `S2`), news image thumbnails, and programmatic highlighting synced with audio narration playback. |
| **Multiple perspectives** | **Working** | Interactive comparison of editorial angles, emphasis, shared agreements, key differences, and supporting source badges. Explicit "Sources broadly agree" state displayed when no divergent clusters exist. |
| **What we know vs what's unclear** | **Working** | Categorized display of verified facts, reported claims (with attribution), and unresolved questions, with evidence chips linked to sources. |
| **Article explorer** | **Working** | Detailed article view with publication name, headline, date, concise snippet, news image, and direct link to the original article. Clicking a timeline card opens the full translated article reader with Bulbul TTS summary. |
| **Clickable source citations** | **Working** | Clicking source badges anywhere (`[S1]`, `[S2]` in timeline, perspectives, facts, or Q&A) highlights or opens the corresponding article reference. Direct source links navigate immediately to the publisher's live article. |
| **Multilingual reading (Sarvam Translate)** | **Working** | Full support across 23 Indian languages + English via `SarvamTranslate`. Batched translation for summary, timeline, perspectives, and facts with per-session language caching. Original script toggle available in article reader. |
| **Bulbul audio narration** | **Working** | High-fidelity speech synthesis using `bulbul:v4-flash` with native speaker personas (e.g. `aditya_hi_conversational`, `shubh_en_narration`). Text chunking respects TTS limits; audio playback includes play, pause, progress scrubber, and timeline event synchronization. |
| **Voice Q&A (Saaras + Sarvam-105B + Bulbul)** | **Working** | Voice input via MediaRecorder with normalized `audio/webm` MIME. Transcribed via Saaras STT (`saaras:v4`), grounded in retrieved articles with 3–4 turn conversation memory, translated to UI language, and vocalized via Bulbul TTS. Fallback typed input provided. |
| **Error / loading / empty states** | **Working** | Comprehensive UX states: horizontal animated progress ribbon with stage inspection, glassmorphic loading skeletons, microphone permission prompts, empty state handling, and error alert banners. |

---

## 2. End-to-End Workflow Architecture

```text
Upload newspaper image / Camera Capture
  → Sarvam Doc AI (Layout analysis & OCR) + Header/Footer Date Detection
  → Headline Extraction & Language ID (Sarvam LID)
  → User selects candidate headline
  → Tavily Live News Search (5 articles + article images)
  → Article Extraction & 3-gram MinHash Deduplication
  → Story Context Collection (Stable Source IDs: S0...S4)
  → Sarvam-105B Structured Story Generation (JSON schema)
  → Server-Side Citation Verification (NFKC quote matching >= 20 chars)
  → Multi-Cluster Perspective Downgrade (prevents manufactured conflict)
  → Interactive Dashboard:
       ├── Headline, Summary & Progress Ribbon
       ├── Animated Event Timeline (with news imagery & narration sync)
       ├── Multiple Perspectives / "Sources broadly agree"
       ├── What We Know (Facts, Claims, Unresolved Questions)
       ├── Article Explorer & Translated Article Reader
       ├── Clickable Source Citations & Direct Publisher Links
       ├── 23-Language Selector (Sarvam Translate)
       ├── Bulbul Audio Narration Player
       └── Voice Q&A Panel (Saaras STT → Sarvam-105B → Translate → Bulbul TTS)
```

---

## 3. Environment Variables Configuration

The following environment variables are required in `.env`:

```bash
# Sarvam AI API
SARVAM_API_KEY=<your-sarvam-api-key>
SARVAM_BASE_URL=https://api.sarvam.ai

# Models
LLM_MODEL=sarvam-105b-conversations
STT_MODEL=saaras:v4
TTS_MODEL=bulbul:v4-flash

# Tavily Search API
TAVILY_API_KEY=<your-tavily-api-key>

# App Settings
BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
```

---

## 4. Verification Evidence

### Backend Unit & Integration Tests
```
53 passed in 4.26s
All adapters, validation rules, temporal parsers, shingle deduplication, story pipeline, and article detail endpoints verified.
```

### Frontend Tests & Production Build
```
✓ src/__tests__/components.test.tsx (6 tests) 201ms
✓ built in 1.38s (0 TypeScript errors)
```

### Live Smoke Test Execution
```
KhabarLens: End-to-End Pipeline Smoke Test
Input Image: sample_english_clip.jpg (245424 bytes)
[1/6] OCR & Date Detection: en-IN, date: 2026-03-15 (6.32s)
[2/6] Headline Candidates: 3 found (0.50s)
[3/6] Web Retrieval: 4 articles fetched via Tavily (4.02s)
[4/6] Shingle Clustering: 4 articles grouped into 4 distinct cluster(s)
[5/6] Story Generation: Sarvam-105B returned validated story (11.39s)
[6/6] Validation: 5 timeline events, 2 perspectives, 9 total quotes verified
[7/7] Q&A & TTS: Saaras + Sarvam-105B + Bulbul TTS audio synthesized (3.88s)
SUCCESS: Full KhabarLens pipeline executed without errors!
```

---

## 5. Instructions to Run the Application

### Start the Backend
```bash
cd backend
..\.venv\Scripts\uvicorn.exe app.main:app --port 8000 --reload
```

### Start the Frontend
```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173` in your browser.
