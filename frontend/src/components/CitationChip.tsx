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
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition shadow-sm border ${
        isS0
          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
          : 'bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/60'
      }`}
    >
      {isS0 ? (
        <Newspaper className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      ) : (
        <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
      )}
      <span className="font-semibold">{label}</span>
    </button>
  );
}
