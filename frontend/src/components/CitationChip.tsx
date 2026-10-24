import { BookOpen, Newspaper } from 'lucide-react';
import type { Source } from '../types';

interface CitationChipProps {
  sourceId: string;
  source?: Source;
  quote?: string;
  onSelect: (sourceId: string, quote?: string) => void;
}

export function CitationChip({ sourceId, source, quote, onSelect }: CitationChipProps) {
  const isS0 = sourceId === 'S0' || source?.kind === 'uploaded_newspaper';
  const label = isS0
    ? 'S0 · Newspaper'
    : `${sourceId} · ${source?.publisher || 'Web Report'}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(sourceId, quote)}
      aria-label={`View evidence source ${label}`}
      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition shadow-sm border border-[#D8D0C8] dark:border-[#3E3835] bg-[#F9F4ED] dark:bg-[#1F1D1B] text-[#2A2A2A] dark:text-[#EDEAEA] hover:border-[#AF695C] hover:text-[#AF695C]"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {isS0 ? (
        <Newspaper className="w-3.5 h-3.5 text-[#AF695C]" />
      ) : (
        <BookOpen className="w-3.5 h-3.5 text-[#AF695C]" />
      )}
      <span className="font-semibold">{label}</span>
    </button>
  );
}
