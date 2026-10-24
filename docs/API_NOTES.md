# Sarvam AI & Tavily API Notes (Verified against Live Docs)

This document contains verified endpoints, headers, payload schemas, response structures, supported languages, limits, and behavior as verified against official Sarvam AI (https://docs.sarvam.ai) and Tavily (https://docs.tavily.com) documentation on October 23, 2026.

---

## 1. Authentication

* **Header:** `api-subscription-key: <SARVAM_API_KEY>` (or `Authorization: Bearer <SARVAM_API_KEY>`)
* **Base URL:** `https://api.sarvam.ai`

---

## 2. Sarvam Vision (Document Intelligence)

* **Documentation:** `https://docs.sarvam.ai/api-reference/doc-ai/job/digitise`
* **Purpose:** Digitise newspaper scans/photos into structured text/markdown/HTML blocks with reading order.
* **Initiate Job Endpoint:** `POST https://api.sarvam.ai/doc-ai/v1/job/digitise`
  * **Content-Type:** `multipart/form-data`
  * **Headers:** `api-subscription-key: <KEY>`
  * **Body Parameters:**
    * `file` (binary, required): Image or PDF file (`.jpg`, `.jpeg`, `.png`, `.pdf`, `.zip`).
    * `language` (string, optional): BCP-47 language tag (e.g., `hi-IN`, `en-IN`). Defaults to Indic when omitted. Note: Parameter is named `language` (not `language_code`).
    * `output_format` (string, optional): `"md"`, `"html"`, or `"json"` (default: `"html"`, note: `"md"` must be used, not `"markdown"`).
  * **Response (201 Created):**
    ```json
    {
      "job_id": "019fb81e-2543-70bd-a737-b5a2d62a3bb7",
      "status": "pending",
      "run_id": "..."
    }
    ```
* **Poll Status Endpoint:** `GET https://api.sarvam.ai/doc-ai/v1/job/{job_id}/status`
  * **Headers:** `api-subscription-key: <KEY>`
  * **Response:**
    ```json
    {
      "job_id": "019fb81e-2543-70bd-a737-b5a2d62a3bb7",
      "status": "pending" | "running" | "completed" | "partially_completed" | "failed" | "rejected",
      "pipeline": "digitise",
      "usage": {
        "pages_total": 1,
        "pages_processed": 1,
        "pages_succeeded": 1,
        "pages_failed": 0
      }
    }
    ```
* **Fetch Results Endpoint:** `GET https://api.sarvam.ai/doc-ai/v1/job/{job_id}/results?format=json` (or `format=md`)
  * **Response (200 OK):**
    ```json
    {
      "type": "digitise",
      "documents": [
        {
          "file_name": "image.jpg",
          "pages": [
            {
              "page_number": 1,
              "content": "<h1>...</h1><p>...</p>"
            }
          ]
        }
      ],
      "job_id": "...",
      "status": "completed",
      "usage": { "pages_total": 1, "pages_processed": 1, "pages_succeeded": 1, "pages_failed": 0 }
    }
    ```
* **Download URL Endpoint (Alternative):** `GET https://api.sarvam.ai/doc-ai/v1/job/{job_id}/download-url`
* **Supported Languages (23 languages):**
  `hi-IN`, `bn-IN`, `ta-IN`, `te-IN`, `mr-IN`, `gu-IN`, `kn-IN`, `ml-IN`, `od-IN`, `pa-IN`, `as-IN`, `brx-IN`, `doi-IN`, `ks-IN`, `kok-IN`, `mai-IN`, `mni-IN`, `ne-IN`, `sa-IN`, `sat-IN`, `sd-IN`, `ur-IN`, `en-IN`.
* **Accepted Input Format:** PNG, JPEG/JPG, PDF, ZIP (single image directly accepted).
* **Limits:** Max 10 pages / images, max 200 MB.

---

## 3. Sarvam Language Identification (LID)

* **Documentation:** `https://docs.sarvam.ai/api-reference/text/identify-language`
* **Endpoint:** `POST https://api.sarvam.ai/text-lid`
* **Content-Type:** `application/json`
* **Headers:** `api-subscription-key: <KEY>`
* **Request:**
  ```json
  {
    "input": "नमस्ते आप कैसे हैं"
  }
  ```
  * Limit: Max 1000 characters.
* **Response (200 OK):**
  ```json
  {
    "request_id": "...",
    "language_code": "hi-IN",
    "script_code": "Deva"
  }
  ```
* **Supported Detected Languages (11 main):**
  `en-IN`, `hi-IN`, `bn-IN`, `gu-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `od-IN`, `pa-IN`, `ta-IN`, `te-IN`.

---

## 4. Sarvam Translation

* **Documentation:** `https://docs.sarvam.ai/api-reference/text/translate-text`
* **Endpoint:** `POST https://api.sarvam.ai/translate`
* **Content-Type:** `application/json`
* **Headers:** `api-subscription-key: <KEY>`
* **Request:**
  ```json
  {
    "input": "...",
    "source_language_code": "auto" | "hi-IN" | "...",
    "target_language_code": "en-IN" | "hi-IN" | "...",
    "model": "sarvam-translate:v1" | "mayura:v1",
    "mode": "formal"
  }
  ```
* **Limits:**
  * `sarvam-translate:v1`: max 2000 characters per request, formal mode, supports all 23 languages.
  * `mayura:v1`: max 1000 characters per request, supports 11 languages + `auto` source detection.
* **Response (200 OK):**
  ```json
  {
    "request_id": "...",
    "translated_text": "...",
    "source_language_code": "..."
  }
  ```

---

## 5. Sarvam Transliteration

* **Documentation:** `https://docs.sarvam.ai/api-reference/text/transliterate-text`
* **Endpoint:** `POST https://api.sarvam.ai/transliterate`
* **Content-Type:** `application/json`
* **Headers:** `api-subscription-key: <KEY>`
* **Request:**
  ```json
  {
    "input": "...",
    "source_language_code": "hi-IN" | "auto" | "...",
    "target_language_code": "en-IN"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "request_id": "...",
    "transliterated_text": "...",
    "source_language_code": "..."
  }
  ```
* **Supported Languages:** 11 languages (`en-IN`, `hi-IN`, `bn-IN`, `gu-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `od-IN`, `pa-IN`, `ta-IN`, `te-IN`).

---

## 6. Sarvam Chat Completion (LLM)

* **Documentation:** `https://docs.sarvam.ai/api-reference/chat/chat-completions-v1`
* **Endpoint:** `POST https://api.sarvam.ai/v1/chat/completions`
* **Content-Type:** `application/json`
* **Headers:** `api-subscription-key: <KEY>` (or `Authorization: Bearer <KEY>`)
* **Model ID:** `sarvam-105b` (128K context window) or `sarvam-105b-conversations` (32K context window).
* **Request:**
  ```json
  {
    "model": "sarvam-105b",
    "messages": [
      {"role": "system", "content": "..."},
      {"role": "user", "content": "..."}
    ],
    "temperature": 0.1,
    "max_tokens": 2048,
    "response_format": {"type": "json_object"}
  }
  ```
* **Response (200 OK):** Standard OpenAI-compatible response:
  ```json
  {
    "id": "...",
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "..."
        },
        "finish_reason": "stop"
      }
    ]
  }
  ```
* **Supported Languages:** Specially tuned for 11 languages (`en-IN`, `hi-IN`, `bn-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `od-IN`, `pa-IN`, `ta-IN`, `te-IN`, `gu-IN`).

---

## 7. Sarvam Speech to Text (STT - Saaras)

* **Documentation:** `https://docs.sarvam.ai/api-reference/speech-to-text/transcribe`
* **Endpoint:** `POST https://api.sarvam.ai/speech-to-text`
* **Content-Type:** `multipart/form-data`
* **Headers:** `api-subscription-key: <KEY>`
* **Parameters:**
  * `file` (binary, required): Audio file. Supported formats: WAV, MP3, AAC, AIFF, OGG, OPUS, FLAC, MP4/M4A, AMR, WMA, WebM, and PCM. (Direct browser WebM and MP4 recordings are natively supported).
  * `model` (string, optional): `saaras:v4` (default) or `saaras:v3`.
  * `mode` (string, optional): `transcribe`, `translate`, `verbatim`, `translit`, `codemix`. (For code-mixing Hindi/English, `codemix` is ideal).
  * `language_code` (string, optional): `unknown` (for auto-detect) or BCP-47 tag (`hi-IN`, `en-IN`, etc.).
  * `with_timestamps` (boolean, optional): `false`.
* **Response (200 OK):**
  ```json
  {
    "request_id": "...",
    "transcript": "...",
    "language_code": "hi-IN"
  }
  ```
* **Supported Languages:** 23 languages.

---

## 8. Sarvam Text to Speech (TTS - Bulbul)

* **Documentation:** `https://docs.sarvam.ai/api-reference/text-to-speech/convert`
* **Endpoint:** `POST https://api.sarvam.ai/text-to-speech`
* **Content-Type:** `application/json`
* **Headers:** `api-subscription-key: <KEY>`
* **Request:**
  ```json
  {
    "text": "...",
    "language_code": "hi-IN",
    "model": "bulbul:v3",
    "speaker": "shubh",
    "pace": 1.0,
    "speech_sample_rate": 22050,
    "output_audio_codec": "wav"
  }
  ```
* **Limits & Rules:**
  * Max 2500 characters per request for `bulbul:v3`.
  * Supported languages (11 languages): `bn-IN`, `en-IN`, `gu-IN`, `hi-IN`, `kn-IN`, `ml-IN`, `mr-IN`, `od-IN`, `pa-IN`, `ta-IN`, `te-IN`.
  * Speakers for `bulbul:v3`: `shubh` (default), `aditya`, `ritu`, `priya`, `neha`, `rahul`, `pooja`, `rohan`, `simran`, `kavya`, `amit`, `dev`, `ishita`, `shreya`, `ratan`, `varun`, `manan`, `sumit`, `roopa`, `kabir`, etc.
* **Response (200 OK):**
  ```json
  {
    "request_id": "...",
    "audios": [
      "<base64_encoded_wav>"
    ]
  }
  ```

---

## 9. Tavily Search & Extract

* **Documentation:** `https://docs.tavily.com`
* **Search Endpoint:** `POST https://api.tavily.com/search`
  * **Content-Type:** `application/json`
  * **Request:**
    ```json
    {
      "api_key": "<TAVILY_API_KEY>",
      "query": "...",
      "topic": "news",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "max_results": 5
    }
    ```
  * Note: Absolute date filtering uses `start_date` and `end_date` (format: `YYYY-MM-DD`). Do not combine with `time_range`.
  * **Response (200 OK):**
    ```json
    {
      "results": [
        {
          "title": "...",
          "url": "https://...",
          "content": "...",
          "score": 0.89,
          "published_date": "2026-10-20"
        }
      ]
    }
    ```
* **Extract Endpoint:** `POST https://api.tavily.com/extract`
  * **Content-Type:** `application/json`
  * **Request:**
    ```json
    {
      "api_key": "<TAVILY_API_KEY>",
      "urls": ["https://..."]
    }
    ```
  * **Response (200 OK):**
    ```json
    {
      "results": [
        {
          "url": "https://...",
          "raw_content": "..."
        }
      ],
      "failed_results": []
    }
    ```
