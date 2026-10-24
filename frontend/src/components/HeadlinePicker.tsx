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
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] text-[#AF695C] text-xs font-semibold mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#AF695C]" />
          <span>Newspaper Digitized Successfully</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2A2A2A] dark:text-[#F9F4ED]">
          Select Headline to Investigate
        </h2>
        <p className="text-xs sm:text-sm text-[#77716D] mt-1">
          Pick an identified article headline to discover web sources, trace timelines, and build an evidence story.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Candidates Selection Grid / List */}
        <div className="p-6 rounded-[28px] bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] space-y-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#77716D]">
              Identified Headlines ({candidates.length})
            </span>
            <span className="text-[11px] text-[#AF695C] font-medium">
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
                  className={`p-5 rounded-[22px] cursor-pointer transition-all flex items-start space-x-4 border ${
                    isSelected
                      ? 'border-2 border-[#AF695C] bg-[#F9F4ED] dark:bg-[#1F1D1B] shadow-sm transform -translate-y-0.5'
                      : 'border-[#D8D0C8] dark:border-[#3E3835] bg-[#F9F4ED]/50 dark:bg-[#1F1D1B]/50 hover:border-[#AF695C]'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? 'border-[#AF695C] bg-[#AF695C] text-[#F9F4ED]'
                        : 'border-[#D8D0C8] dark:border-[#3E3835] bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm sm:text-base leading-snug transition-colors ${
                        isSelected
                          ? 'text-[#2A2A2A] dark:text-[#F9F4ED] font-bold'
                          : 'text-[#2A2A2A] dark:text-[#EDEAEA]'
                      }`}
                      dir="auto"
                    >
                      {cand.text}
                    </p>
                    <div className="flex items-center space-x-2 mt-2 text-[11px] text-[#77716D]">
                      <span className="font-mono px-2 py-0.5 rounded-md bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] text-[#2A2A2A] dark:text-[#EDEAEA]">
                        {cand.id}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-[#AF695C]">
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
          <div className="p-5 rounded-[24px] bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] flex flex-col justify-between space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#AF695C]/10 border border-[#AF695C]/20 text-[#AF695C] flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <label htmlFor="pub-date" className="text-xs font-bold uppercase tracking-wider text-[#2A2A2A] dark:text-[#F9F4ED] block">
                  Publication Date
                </label>
                <p className="text-[11px] text-[#77716D]">
                  {initialDate ? 'Detected from masthead' : 'Undetected (optional)'}
                </p>
              </div>
            </div>

            <input
              id="pub-date"
              type="date"
              value={newspaperDate}
              onChange={(e) => setNewspaperDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#F9F4ED] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] text-[#2A2A2A] dark:text-[#F9F4ED] focus:outline-none focus:ring-2 focus:ring-[#AF695C]"
            />
          </div>

          {/* Story Output Language Selector */}
          <div className="p-5 rounded-[24px] bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] flex flex-col justify-between space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#AF695C]/10 border border-[#AF695C]/20 text-[#AF695C] flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <label htmlFor="story-lang" className="text-xs font-bold uppercase tracking-wider text-[#2A2A2A] dark:text-[#F9F4ED] block">
                  Story Language
                </label>
                <p className="text-[11px] text-[#77716D]">
                  Target output &amp; audio language
                </p>
              </div>
            </div>

            <select
              id="story-lang"
              value={displayLanguage}
              onChange={(e) => setDisplayLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#F9F4ED] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] text-[#2A2A2A] dark:text-[#F9F4ED] focus:outline-none focus:ring-2 focus:ring-[#AF695C]"
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
          <div className="rounded-2xl border border-[#D8D0C8] dark:border-[#3E3835] bg-[#EDEAEA]/50 dark:bg-[#282523]/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExcerpt(!showExcerpt)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-[#77716D] hover:text-[#2A2A2A] dark:hover:text-[#F9F4ED]"
            >
              <span className="flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-[#AF695C]" />
                <span>View Raw OCR Text Preview</span>
              </span>
              {showExcerpt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showExcerpt && (
              <div className="p-4 pt-0 border-t border-[#D8D0C8]/60 dark:border-[#3E3835]/60">
                <p className="text-xs font-mono text-[#2A2A2A] dark:text-[#EDEAEA] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
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
          className="w-full py-4.5 px-6 rounded-2xl font-bold text-sm sm:text-base text-[#F9F4ED] bg-[#AF695C] hover:bg-[#99594D] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center space-x-2.5 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-[#F9F4ED]" />
          <span>{isLoading ? 'Building Evidence Story...' : 'Generate Evidence-Linked Story →'}</span>
        </button>
      </form>
    </div>
  );
}
