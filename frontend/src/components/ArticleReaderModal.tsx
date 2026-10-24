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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50 backdrop-blur">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {source.id}
            </span>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{source.publisher || 'Verified Publisher'}</span>
                </span>
                {source.published_at && (
                  <>
                    <span>•</span>
                    <span className="flex items-center space-x-1 font-mono">
                      <Calendar className="w-3 h-3" />
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
                className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition"
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
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              title="Toggle font size"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Fetching &amp; Translating Full Article into {getLanguageName(displayLanguage)}...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm text-center">
                Translating with Sarvam Translate &amp; synthesizing Bulbul audio summary
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
              <p className="font-semibold">{error}</p>
              <p className="mt-1">Falling back to original extracted content:</p>
              <div className="mt-3 p-4 rounded-xl bg-white dark:bg-slate-900 font-mono leading-relaxed whitespace-pre-wrap">
                {source.original_text}
              </div>
            </div>
          ) : (
            <>
              {/* Optional Article Header Banner Image */}
              {(detail?.image_url || source.image_url) && (
                <div className="w-full h-56 sm:h-72 rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 relative bg-black/5 dark:bg-black/30">
                  <img
                    src={detail?.image_url || source.image_url || ''}
                    alt={source.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                    <span className="text-xs font-mono text-white/90 bg-black/40 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
                      {source.publisher || 'Verified Article Visual'}
                    </span>
                  </div>
                </div>
              )}

              {/* Headline */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                  {showOriginal ? detail?.title || source.title : detail?.translated_title || source.title}
                </h3>

                {/* Language Switch Pill */}
                <div className="flex items-center space-x-2 mt-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                    <Languages className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Language:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition"
                  >
                    {showOriginal ? 'Switch to Translated' : 'View in Original Script'}
                  </button>
                </div>
              </div>

              {/* Audio Summary Card */}
              {detail?.audio_base64 && (
                <div className="p-4.5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-rose-50/40 to-indigo-50/80 dark:from-slate-950 dark:via-indigo-950/40 dark:to-slate-950 border border-amber-200/80 dark:border-white/10 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Sarvam Bulbul Audio Summary ({getLanguageName(displayLanguage)})
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={restartAudio}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10"
                        title="Restart audio"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pause' : 'Listen Summary'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Audio Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-indigo-600 h-full transition-all duration-200"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>

                  {/* Summary Text Excerpt */}
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 italic">
                    "{detail.summary}"
                  </p>
                </div>
              )}

              {/* Full Article Body */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Full Article Text
                  </h4>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 hover:underline"
                    >
                      <span>Read on {source.publisher || 'publisher website'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div
                  className={`prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 ${fontClass}`}
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
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Source: {source.title}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
          >
            Close Reader
          </button>
        </div>
      </div>
    </div>
  );
}
