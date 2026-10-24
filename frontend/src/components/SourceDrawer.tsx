import { useEffect } from 'react';
import { X, ExternalLink, Globe, Calendar, Newspaper, Quote } from 'lucide-react';
import type { Source } from '../types';
import { getLanguageName } from '../lib/languages';

interface SourceDrawerProps {
  source: Source | null;
  highlightQuote?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SourceDrawer({ source, highlightQuote, isOpen, onClose }: SourceDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !source) return null;

  const isS0 = source.kind === 'uploaded_newspaper' || source.id === 'S0';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200 font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#2A2A2A]/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-[#F9F4ED] text-[#2A2A2A] shadow-2xl border-l border-[#D8D0C8] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-[#D8D0C8] flex items-start justify-between bg-[#F9F4ED]">
            <div className="space-y-1 pr-4">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#AF695C]/15 text-[#AF695C] border border-[#AF695C]/30">
                  {source.id}
                </span>
                <span className="text-xs font-medium text-[#77716D]">
                  {source.publisher || (isS0 ? 'Uploaded Newspaper' : 'Web Article')}
                </span>
                {source.machine_translated && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EDEAEA] text-[#77716D] border border-[#D8D0C8]">
                    Machine-Translated
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-[#2A2A2A] leading-snug" dir="auto">
                {source.title}
              </h3>
            </div>

            <button
              onClick={onClose}
              aria-label="Close drawer"
              className="p-2 rounded-xl text-[#77716D] hover:text-[#2A2A2A] hover:bg-[#EDEAEA] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Metadata Bar */}
          <div className="px-6 py-3 bg-[#EDEAEA] border-b border-[#D8D0C8] flex flex-wrap items-center gap-4 text-xs text-[#77716D]">
            {source.published_at && (
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#AF695C]" />
                <span className="text-[#2A2A2A]">{source.published_at}</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-[#AF695C]" />
              <span className="text-[#2A2A2A]">{getLanguageName(source.language)}</span>
            </div>
            {isS0 && (
              <div className="flex items-center space-x-1.5 text-[#AF695C] font-semibold">
                <Newspaper className="w-3.5 h-3.5" />
                <span>Uploaded Newspaper Clipping</span>
              </div>
            )}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Highlighted Quote Callout if provided */}
            {highlightQuote && (
              <div className="p-4 rounded-2xl bg-[#EDEAEA] border border-[#AF695C]/40 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#AF695C]">
                  <Quote className="w-3.5 h-3.5" />
                  <span>Cited Verbatim Evidence Quote</span>
                </div>
                <blockquote className="text-xs sm:text-sm text-[#2A2A2A] italic leading-relaxed" dir="auto">
                  "{highlightQuote}"
                </blockquote>
              </div>
            )}

            {/* Article Body */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#77716D] mb-3">
                {source.machine_translated ? 'Translated Body Context' : 'Original Text Excerpt'}
              </h4>
              <div
                className="text-xs sm:text-sm text-[#2A2A2A] leading-relaxed whitespace-pre-wrap"
                dir="auto"
              >
                {source.model_text}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-[#D8D0C8] bg-[#EDEAEA] flex items-center justify-between">
            {source.url && !isS0 ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#AF695C] hover:bg-[#99594D] text-white text-xs font-semibold shadow-sm transition"
              >
                <span>Open Original Article</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-xs text-[#77716D]">
                Primary source: Photographed newspaper page
              </span>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#2A2A2A] hover:bg-[#D8D0C8]/50 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
