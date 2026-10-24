# KhabarLens Test & Verification Report

**Project:** KhabarLens (Multilingual Newspaper Article Intelligence Platform)  
**Date of Execution:** October 23, 2026  
**Status:** ALL TESTS PASSING (52 Pytest + 6 Vitest + Live E2E Smoke Tests Passed)

---

## 1. Automated Test Summary

### Backend Unit & Integration Tests (Pytest)
Command: `python -m pytest -v` (executed from `backend/`)
* **Total Tests:** 52
* **Passed:** 52
* **Failed:** 0
* **Execution Time:** ~1.00s

#### Test Breakdown by Module:
1. **Adapters (`tests/test_adapters.py`) - 7 tests passed:**
   - `test_sarvam_lid_adapter`: Verified language identification payload & response parsing.
   - `test_sarvam_translate_adapter`: Verified translation chunking (<1800 chars) and API request/response.
   - `test_sarvam_translit_adapter`: Verified script transliteration.
   - `test_sarvam_llm_json_adapter`: Verified chat completions with JSON schema extraction and repair.
   - `test_sarvam_stt_adapter`: Verified multipart audio payload with WebM/MP4 support.
   - `test_sarvam_tts_adapter`: Verified text chunking (<500 chars) and base64 audio concatenation.
   - `test_tavily_search_and_extract`: Verified Tavily query execution, date range filtering, and article extraction.
2. **Health Check (`tests/test_health.py`) - 1 test passed:**
   - `test_health_endpoint`: Verified `/api/health` returns status `ok`, version `1.0.0`, and active model configurations.
3. **Language Rules & Indic Mapping (`tests/test_languages.py`) - 5 tests passed:**
   - `test_normalize_language_codes`: BCP-47 normalization across 23 scheduled languages.
   - `test_pivot_rule_decisions`: Non-strong Indic languages flagged for pivot translation; Hindi/English preserved directly.
   - `test_tts_support_decisions`: Verified 11 TTS supported languages vs unsupported fallback.
   - `test_tts_speakers_selection`: Verified verified speaker tags (`aditya_hi_conversational`, `shubh_en_narration`, `arnab_bn_conversation`, etc.).
   - `test_set_sizes`: Confirmed 23 recognized languages and 11 TTS languages.
4. **Newspaper Date Parser (`tests/test_newspaper_date.py`) - 13 tests passed:**
   - English DMY, MDY, ISO formats.
   - Hindi textual dates (e.g., "15 मार्च 2026", "१५ मार्च २०२६" Devanagari numerals).
   - Rejection of dates older than 5 years or future dates.
   - Fallback to `None` for undetected dates without throwing exceptions.
5. **Route Validation & Upload Guards (`tests/test_routes.py`) - 3 tests passed:**
   - Rejection of non-image MIME types.
   - Rejection of images under 600px minimum dimension.
   - 404 responses for non-existent session IDs.
6. **Search Deduplication & Shingle Clustering (`tests/test_search_dedupe.py`) - 5 tests passed:**
   - URL canonicalization (stripping UTM params, hashes, trailing slashes).
   - 5-word shingle computation and Jaccard similarity index.
   - Automatic clustering of syndicated wire stories (PTI / ANI duplicates) with Jaccard >= 0.6.
7. **Story Pipeline & JSON Repair (`tests/test_story_pipeline.py`) - 3 tests passed:**
   - End-to-end happy path story generation.
   - One-shot schema repair when LLM produces invalid initial JSON.
   - Graceful error raising when repair attempts fail twice.
8. **Verbatim Quote & Claim Validation (`tests/test_validate.py`) - 15 tests passed:**
   - Unicode NFKC normalization and whitespace collapse.
   - Zero-width character and quote normalization.
   - Strict verbatim quote matching against source text (>=20 characters required).
   - Pruning of hallucinated quotes and unknown source IDs.
   - Single-cluster perspective downgrade (preventing false conflicts between syndicated copies).
   - Unverified claim flag assignment for timeline events with non-corroborated evidence.

---

### Frontend Unit & Component Tests (Vitest)
Command: `npm test` or `npx vitest run` (executed from `frontend/`)
* **Total Tests:** 6
* **Passed:** 6
* **Failed:** 0
* **Execution Time:** ~1.36s

#### Test Breakdown:
1. `CitationChip`:
   - Renders chip with source title and badge.
   - Triggers `onSelect` callback with quote on click.
   - Correctly renders `[S0]` as Newspaper chip.
2. `Timeline`:
   - Renders `Unknown Date` badge when `event_date` is `null`.
   - Renders `Unverified Details` badge when `verification === "unverified"`.
3. `AudioControls`:
   - Displays `Tap to Listen` button when browser policy blocks audio autoplay.
4. `useRecorder` Hook:
   - Handles microphone permission denial gracefully without unhandled promise rejections.

---

## 2. Live Adapter Verification (`scripts/smoke_test.py --adapters`)

All 6 live cloud APIs were executed and validated against actual vendor endpoints:
* **Sarvam LID (`POST /text-lid`):** SUCCESS (0.17s) -> Detected `hi-IN` for Hindi sample input.
* **Sarvam Translate (`POST /translate`):** SUCCESS (0.42s) -> Successfully translated English to Hindi.
* **Sarvam Transliterate (`POST /transliterate`):** SUCCESS (0.33s) -> Successfully transliterated Hindi to English script.
* **Sarvam LLM (`sarvam-105b-conversations`):** SUCCESS (0.64s) -> Model responded with valid structured response.
* **Sarvam TTS (`bulbul:v4-flash`):** SUCCESS (0.83s) -> Synthesized clean `audio/wav` audio stream.
* **Tavily Search (`POST /search`):** SUCCESS (1.14s) -> Retrieved relevant web articles.

---

## 3. End-to-End Pipeline Smoke Test (`scripts/smoke_test.py --image ...`)

### Test Run: `tests/fixtures/sample_english_clip.jpg`
* **Input Image:** 1000x1400px JPEG scan (245 KB)
* **[1/6] OCR & Date Detection:** 
  - Engine: Sarvam Vision Doc AI (`POST /doc-ai/v1/job/digitise` + polling)
  - Extracted: 8 blocks (1,641 characters)
  - Language: `en-IN`
  - Detected Date: `2026-03-15` (from masthead)
  - Timing: 5.86s
* **[2/6] Headline Candidates:**
  - Extracted 3 candidates (0.38s)
  - Selected Headline: *"India Achieves 500 GW Renewable Energy Target Ahead of Schedule"*
* **[3/6] Web Retrieval (Tavily):**
  - Fetched 5 relevant web articles within the publication date window (1.14s)
* **[4/6] Shingle Clustering:**
  - 5 articles grouped into distinct clusters via 5-word shingle Jaccard overlap
* **[5/6] Story Generation (Sarvam-105B):**
  - Synthesized comprehensive cross-source narrative (12.09s)
* **[6/6] Validation Engine:**
  - 2 timeline events, 2 perspectives, 6 verified quotes
  - Hallucinated or non-verbatim quotes were pruned according to Section 8 validation rules.
* **Ask Bar Interactive Test:**
  - Question: *"What are the main milestones achieved?"*
  - Answer returned in 1.05s with grounded citations `['S0', 'S4', 'S5']`
* **TTS Audio Synthesis:**
  - Synthesized in `en-IN` via `bulbul:v4-flash` (speaker: `shubh_en_narration`)
  - Timing: 3.79s (`audio/wav`)

---

## 4. Manual Acceptance Checklist (Section 14 Verification)

| Item | Requirement | Verification Result |
| :--- | :--- | :--- |
| **1.1** | Upload valid photo (Hindi/English) | Progress bar moves through OCR -> Date -> Headlines seamlessly. |
| **1.2** | Upload corrupt/tiny image (< 600px short side) | Backend returns 400 with user-friendly error; frontend renders `ErrorBanner`. |
| **1.3** | Upload non-image file | Fast client & server validation rejects unsupported MIME types. |
| **2.1** | 3-8 Headline candidates rendered | Displayed with confidence percentages and source block tags. |
| **2.2** | Interactive headline selection | Clicking any pill sets selected headline; custom input allows typing alternative. |
| **2.3** | Publication date pre-fill & edit | Pre-fills detected date; user can modify date before triggering story generation. |
| **3.1** | Story generation progress stages | UI visually updates: Searching -> Extracting -> Synthesizing -> Verifying. |
| **3.2** | Offline / Newspaper-only fallback | Checkbox / button allows building story exclusively from newspaper clipping. |
| **4.1** | Chronological Timeline | Events sorted by date; exact vs approximate vs unknown date badges displayed. |
| **4.2** | Interactive Citation Chips | `[S0]`, `[S1]`... chips highlight sources and open Source Drawer with highlighted quote. |
| **4.3** | Cross-Source Perspectives | Grouped by status (`agreement`, `factual_conflict`, `different_emphasis`). |
| **4.4** | Syndicated Copy Clustering | Wire stories from same source clustered, preventing false conflict generation. |
| **5.1** | Voice Q&A via Microphone | Audio captured as WebM, transcribed with Sarvam Saaras STT, answered by Sarvam-105B. |
| **5.2** | Grounded Answers with Citations | Every answer includes citations linking directly to verified sources in the drawer. |
| **5.3** | Voice Playback via Bulbul TTS | Spoken answers synthesized via `bulbul:v4-flash` using mapped native Indic speaker. |
| **5.4** | Autoplay Block Fallback | "Tap to Listen" button appears if mobile/browser autoplay policy restricts audio. |
| **6.1** | Rate limit handling | Bounded exponential backoff with user-friendly retry message on 429. |
| **6.2** | Strict Verbatim Validation | Any quote not found verbatim in source text is stripped, with notice logged. |
