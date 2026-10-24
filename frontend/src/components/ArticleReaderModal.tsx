import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ExternalLink, 
  Play, 
  Pause, 
  RotateCcw, 
  Calendar, 
  Building2, 
  Loader2, 
  Languages, 
  Sparkles,
  Type
} from 'lucide-react';
import type { Source, ArticleDetailResponse } from '../types';
import { api } from '../api/client';
import { getLanguageName } from '../lib/languages';

interface ArticleReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
  sessionId: string;
  displayLanguage: string;
}

export function ArticleReaderModal({
  isOpen,
  onClose,
  source,
  sessionId,
  displayLanguage,
}: ArticleReaderModalProps) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ArticleDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showOriginal, setShowOriginal] = useState(false);

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen || !source) {
      setDetail(null);
      setError(null);
      setIsPlaying(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .getArticleDetail({
        sessionId,
        sourceId: source.id,
        targetLanguage: displayLanguage,
      })
      .then((data) => {
        if (isMounted) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load article detail:', err);
          setError(err.message || 'Could not translate full article.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isOpen, source, sessionId, displayLanguage]);

  // Audio Playback
  useEffect(() => {
    if (detail?.audio_base64) {
      const mime = detail.audio_mime || 'audio/wav';
      const audio = new Audio(`data:${mime};base64,${detail.audio_base64}`);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlaying(false);
        setAudioProgress(0);
      };

      return () => {
        audio.pause();
        audio.src = '';
      };
    }
  }, [detail]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const restartAudio = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  if (!isOpen || !source) return null;

  const fontClass =
    fontSize === 'xlarge'
      ? 'text-lg leading-loose'
      : fontSize === 'large'
      ? 'text-base leading-relaxed'
      : 'text-sm leading-relaxed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#2A2A2A]/60 backdrop-blur-md animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-3xl bg-[#F9F4ED] border border-[#D8D0C8] shadow-2xl flex flex-col overflow-hidden text-[#2A2A2A]">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-[#D8D0C8] flex items-center justify-between bg-[#EDEAEA]">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-[#AF695C]/15 text-[#AF695C] border border-[#AF695C]/30">
              {source.id}
            </span>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 text-xs text-[#77716D]">
                <span className="font-semibold text-[#2A2A2A] flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-[#AF695C]" />
                  <span>{source.publisher || 'Verified Publisher'}</span>
                </span>
                {source.published_at && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1 font-mono">
                      <Calendar className="w-3 h-3 text-[#AF695C]" />
                      <span>{source.published_at}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#AF695C] hover:bg-[#F9F4ED] border border-transparent hover:border-[#D8D0C8] transition"
              >
                <span>Original Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Font Size Selector */}
            <button
              type="button"
              onClick={() => {
                if (fontSize === 'normal') setFontSize('large');
                else if (fontSize === 'large') setFontSize('xlarge');
                else setFontSize('normal');
              }}
              className="p-2 rounded-xl text-[#77716D] hover:text-[#2A2A2A] hover:bg-[#F9F4ED] transition"
              title="Toggle font size"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#77716D] hover:text-[#2A2A2A] hover:bg-[#F9F4ED] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-[#F9F4ED]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EDEAEA] border border-[#D8D0C8] flex items-center justify-center text-[#AF695C]">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-[#2A2A2A]">
                Fetching &amp; Translating Full Article into {getLanguageName(displayLanguage)}...
              </p>
              <p className="text-xs text-[#77716D] max-w-sm text-center">
                Translating with Sarvam Translate &amp; synthesizing Bulbul audio summary
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-[#EDEAEA] border border-[#AF695C]/40 text-[#2A2A2A] text-xs">
              <p className="font-semibold text-[#AF695C]">{error}</p>
              <p className="mt-1 text-[#77716D]">Falling back to original extracted content:</p>
              <div className="mt-3 p-4 rounded-xl bg-[#F9F4ED] border border-[#D8D0C8] font-mono leading-relaxed whitespace-pre-wrap">
                {source.original_text}
              </div>
            </div>
          ) : (
            <>
              {/* Optional Article Header Banner Image */}
              {(detail?.image_url || source.image_url) && (
                <div className="w-full h-56 sm:h-72 rounded-3xl overflow-hidden shadow-lg border border-[#D8D0C8] relative bg-[#EDEAEA]">
                  <img
                    src={detail?.image_url || source.image_url || ''}
                    alt={source.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2A2A2A]/80 via-[#2A2A2A]/20 to-transparent flex items-end p-5">
                    <span className="text-xs font-mono text-[#F9F4ED] bg-[#2A2A2A]/60 backdrop-blur px-3 py-1 rounded-full border border-white/20">
                      {source.publisher || 'Verified Article Visual'}
                    </span>
                  </div>
                </div>
              )}

              {/* Headline */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#2A2A2A] tracking-tight leading-snug">
                  {showOriginal ? detail?.title || source.title : detail?.translated_title || source.title}
                </h3>

                {/* Language Switch Pill */}
                <div className="flex items-center space-x-2 mt-3">
                  <span className="text-xs font-medium text-[#77716D] flex items-center space-x-1">
                    <Languages className="w-3.5 h-3.5 text-[#AF695C]" />
                    <span>Language:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#AF695C]/15 text-[#AF695C] hover:bg-[#AF695C]/25 border border-[#AF695C]/30 transition"
                  >
                    {showOriginal ? 'Switch to Translated' : 'View in Original Script'}
                  </button>
                </div>
              </div>

              {/* Audio Summary Card */}
              {detail?.audio_base64 && (
                <div className="p-4.5 rounded-2xl bg-[#EDEAEA] border border-[#D8D0C8] shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-[#AF695C] text-white flex items-center justify-center shadow-sm">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#2A2A2A]">
                        Sarvam Bulbul Audio Summary ({getLanguageName(displayLanguage)})
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={restartAudio}
                        className="p-1.5 rounded-lg text-[#77716D] hover:text-[#2A2A2A] hover:bg-[#F9F4ED]"
                        title="Restart audio"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-[#AF695C] hover:bg-[#99594D] text-white text-xs font-bold shadow-sm transition cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pause' : 'Listen Summary'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Audio Progress Bar */}
                  <div className="w-full bg-[#D8D0C8] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#AF695C] h-full transition-all duration-200"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>

                  {/* Summary Text Excerpt */}
                  <p className="text-xs font-medium text-[#77716D] italic">
                    "{detail.summary}"
                  </p>
                </div>
              )}

              {/* Full Article Body */}
              <div className="space-y-4 pt-2 border-t border-[#D8D0C8]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#77716D]">
                    Full Article Text
                  </h4>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#AF695C] flex items-center space-x-1 hover:underline"
                    >
                      <span>Read on {source.publisher || 'publisher website'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div
                  className={`max-w-none text-[#2A2A2A] ${fontClass}`}
                  dir="auto"
                >
                  {(showOriginal ? detail?.original_text || source.original_text : detail?.translated_text || source.model_text)
                    .split('\n\n')
                    .map((para, pIdx) => (
                      <p key={pIdx} className="mb-4 leading-relaxed">
                        {para}
                      </p>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#EDEAEA] border-t border-[#D8D0C8] flex items-center justify-between text-xs text-[#77716D]">
          <span>Source: {source.title}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#F9F4ED] border border-[#D8D0C8] font-semibold text-[#2A2A2A] hover:bg-[#D8D0C8]/40 transition"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
}
