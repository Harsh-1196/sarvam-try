export interface HeadlineCandidate {
  id: string;
  text: string;
  block_ids: string[];
  confidence: number;
}

export interface Source {
  id: string; // S0..S5
  kind: 'uploaded_newspaper' | 'web';
  title: string;
  publisher?: string | null;
  url?: string | null;
  published_at?: string | null;
  language: string;
  original_text: string;
  model_text: string;
  machine_translated: boolean;
  cluster_id?: string | null;
  image_url?: string | null;
}

export interface EvidenceItem {
  source_id: string;
  quote: string;
}

export interface TimelineEvent {
  id: string;
  event_date?: string | null;
  date_precision: 'day' | 'month' | 'year' | 'unknown';
  title: string;
  description: string;
  evidence: EvidenceItem[];
  verification: 'verified' | 'unverified';
  image_url?: string | null;
}

export interface Position {
  label: string;
  summary: string;
  evidence: EvidenceItem[];
}

export interface Perspective {
  topic: string;
  status: 'agreement' | 'different_emphasis' | 'factual_conflict' | 'insufficient_evidence';
  positions: Position[];
}

export interface Story {
  headline: string;
  language: string;
  newspaper_date?: string | null;
  sources: Source[];
  timeline: TimelineEvent[];
  perspectives: Perspective[];
  notices: string[];
}

export interface AudioPayload {
  mime: string;
  base64: string;
  chunks?: string[];
}

export interface AskResponse {
  transcript?: string | null;
  answer: string;
  source_ids: string[];
  insufficient_evidence: boolean;
  audio?: AudioPayload | null;
  audio_unavailable_reason?: string | null;
}

export interface TtsResponse {
  mime: string;
  base64: string;
}

export interface QARecord {
  id: string;
  question: string;
  transcript?: string | null;
  answer: string;
  source_ids: string[];
  insufficient_evidence: boolean;
  audio?: AudioPayload | null;
  audio_unavailable_reason?: string | null;
  timestamp: string;
}

export type AppStage =
  | 'upload'
  | 'ocr'
  | 'pick_headline'
  | 'story_loading'
  | 'story';

export type PipelineStage =
  | 'ocr'
  | 'search'
  | 'extract'
  | 'pivot'
  | 'generate'
  | 'validate'
  | 'translate';

export interface HealthStatus {
  status: string;
  demo_mode: boolean;
  models: {
    llm: string;
    stt: string;
    tts: string;
    translate: string;
  };
}

export interface ArticleDetailResponse {
  source_id: string;
  title: string;
  translated_title: string;
  publisher?: string | null;
  url?: string | null;
  published_date?: string | null;
  image_url?: string | null;
  original_text: string;
  translated_text: string;
  target_language: string;
  summary: string;
  audio_base64?: string | null;
  audio_mime?: string | null;
}
