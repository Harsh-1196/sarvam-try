import type {
  HealthStatus,
  HeadlineCandidate,
  Story,
  AskResponse,
  TtsResponse,
  ArticleDetailResponse,
} from '../types';

export class ApiError extends Error {
  code: string;
  retryable: boolean;
  status: number;

  constructor(code: string, message: string, retryable: boolean, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errData: { error?: { code?: string; message?: string; retryable?: boolean } } = {};
    try {
      errData = await res.json();
    } catch {
      // Not JSON
    }
    const code = errData.error?.code || `HTTP_${res.status}`;
    const message = errData.error?.message || `Request failed with status ${res.status}`;
    const retryable = errData.error?.retryable ?? (res.status >= 500 || res.status === 429);
    throw new ApiError(code, message, retryable, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch('/api/health');
    return handleResponse<HealthStatus>(res);
  },

  async uploadNewspaper(file: File, languageHint?: string): Promise<{ session_id: string; stage: string; status: string }> {
    const formData = new FormData();
    formData.append('image', file);
    if (languageHint && languageHint !== 'auto') {
      formData.append('language_hint', languageHint);
    }
    const res = await fetch('/api/newspaper', {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  async getNewspaperStatus(sessionId: string): Promise<{
    status: 'processing' | 'ready' | 'failed';
    stage: string;
    ocr_text_excerpt?: string | null;
    detected_language?: string | null;
    candidates: HeadlineCandidate[];
    newspaper_date?: string | null;
    error?: { code: string; message: string; retryable: boolean };
  }> {
    const res = await fetch(`/api/newspaper/${sessionId}`);
    return handleResponse(res);
  },

  async createStory(payload: {
    session_id: string;
    headline: string;
    newspaper_date?: string | null;
    display_language: string;
    newspaper_only?: boolean;
  }): Promise<{ status: string; stage: string }> {
    const res = await fetch('/api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getStoryStatus(sessionId: string): Promise<{
    status: 'processing' | 'ready' | 'failed';
    stage: string;
    story?: Story | null;
    error?: { code: string; message: string; retryable: boolean };
  }> {
    const res = await fetch(`/api/story/${sessionId}`);
    return handleResponse(res);
  },

  async ask(params: {
    sessionId: string;
    displayLanguage: string;
    text?: string;
    audioBlob?: Blob;
    wantAudio?: boolean;
  }): Promise<AskResponse> {
    const formData = new FormData();
    formData.append('session_id', params.sessionId);
    formData.append('display_language', params.displayLanguage);
    formData.append('want_audio', String(params.wantAudio ?? true));
    if (params.audioBlob) {
      const mime = params.audioBlob.type || 'audio/webm';
      const cleanMime = mime.includes('mp4') ? 'audio/mp4' : 'audio/webm';
      const ext = cleanMime === 'audio/mp4' ? 'mp4' : 'webm';
      const audioFile = new File([params.audioBlob], `query.${ext}`, { type: cleanMime });
      formData.append('audio', audioFile);
    } else if (params.text) {
      formData.append('text', params.text);
    } else {
      throw new Error('Either text or audio must be provided');
    }

    const res = await fetch('/api/ask', {
      method: 'POST',
      body: formData,
    });
    return handleResponse<AskResponse>(res);
  },

  async tts(params: { sessionId?: string; text: string; language: string }): Promise<TtsResponse> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: params.sessionId,
        text: params.text,
        language: params.language,
      }),
    });
    return handleResponse<TtsResponse>(res);
  },

  async getArticleDetail(params: {
    sessionId: string;
    sourceId: string;
    targetLanguage: string;
  }): Promise<ArticleDetailResponse> {
    const res = await fetch('/api/story/article-detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: params.sessionId,
        source_id: params.sourceId,
        target_language: params.targetLanguage,
      }),
    });
    return handleResponse<ArticleDetailResponse>(res);
  },
};
