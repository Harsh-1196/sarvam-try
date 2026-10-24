import { useState } from 'react';
import { CheckCircle2, Calendar, FileText, ChevronDown, ChevronUp, Globe, Sparkles, Check } from 'lucide-react';
import type { HeadlineCandidate } from '../types';
import { LANGUAGES } from '../lib/languages';

interface HeadlinePickerProps {
  candidates: HeadlineCandidate[];
  initialDate?: string | null;
  detectedLanguage?: string | null;
  ocrExcerpt?: string | null;
  onConfirm: (headline: string, newspaperDate?: string | null, displayLanguage?: string) => void;
  isLoading: boolean;
}

export function HeadlinePicker({
  candidates,
  initialDate,
  detectedLanguage,
  ocrExcerpt,
  onConfirm,
  isLoading,
}: HeadlinePickerProps) {
  const [selectedId, setSelectedId] = useState<string>(candidates[0]?.id || '');
  const [headlineText, setHeadlineText] = useState<string>(candidates[0]?.text || '');
  const [newspaperDate, setNewspaperDate] = useState<string>(initialDate || '');
  const [displayLanguage, setDisplayLanguage] = useState<string>(detectedLanguage || 'hi-IN');
  const [showExcerpt, setShowExcerpt] = useState(false);

  const handleSelect = (cand: HeadlineCandidate) => {
    setSelectedId(cand.id);
    setHeadlineText(cand.text);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalHeadline = headlineText.trim() || candidates[0]?.text || '';
    if (!finalHeadline) return;
    onConfirm(finalHeadline, newspaperDate || null, displayLanguage);
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Newspaper Digitized Successfully</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Select Headline to Investigate
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Pick an identified article headline to discover web sources, trace timelines, and build an evidence story.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidates Selection Grid / List */}
        <div className="p-6 rounded-3xl glass-card space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Identified Headlines ({candidates.length})
            </span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              Click any card to select
            </span>
          </div>

          <div className="space-y-3">
            {candidates.map((cand) => {
              const isSelected = selectedId === cand.id || (!selectedId && cand.id === candidates[0]?.id);
              return (
                <div
                  key={cand.id}
                  onClick={() => handleSelect(cand)}
                  className={`p-4.5 rounded-2xl cursor-pointer transition-all flex items-start space-x-4 border ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-500/5'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm sm:text-base font-semibold leading-snug transition-colors ${
                        isSelected
                          ? 'text-indigo-950 dark:text-indigo-100 font-bold'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                      dir="auto"
                    >
                      {cand.text}
                    </p>
                    <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {cand.id}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {Math.round(cand.confidence * 100)}% match confidence
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Story Metadata & Preferences (Date & Language) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Publication Date Badge & Input */}
          <div className="p-4.5 rounded-3xl glass-card flex flex-col justify-between space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <label htmlFor="pub-date" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                  Publication Date
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {initialDate ? 'Detected from masthead' : 'Undetected (optional)'}
                </p>
              </div>
            </div>

            <input
              id="pub-date"
              type="date"
              value={newspaperDate}
              onChange={(e) => setNewspaperDate(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Story Output Language Selector */}
          <div className="p-4.5 rounded-3xl glass-card flex flex-col justify-between space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <label htmlFor="story-lang" className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                  Story Language
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Target output &amp; audio language
                </p>
              </div>
            </div>

            <select
              id="story-lang"
              value={displayLanguage}
              onChange={(e) => setDisplayLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible OCR Excerpt */}
        {ocrExcerpt && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExcerpt(!showExcerpt)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              <span className="flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>View Raw OCR Text Preview</span>
              </span>
              {showExcerpt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showExcerpt && (
              <div className="p-4 pt-0 border-t border-slate-200/50 dark:border-slate-800/50">
                <p className="text-xs font-mono text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {ocrExcerpt}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={isLoading || (!headlineText.trim() && candidates.length === 0)}
          className="w-full py-4.5 px-6 rounded-3xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-rose-500/20 transition-all flex items-center justify-center space-x-2.5 cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
          <span>{isLoading ? 'Building Evidence Story...' : 'Generate Evidence-Linked Story →'}</span>
        </button>
      </form>
    </div>
  );
}
