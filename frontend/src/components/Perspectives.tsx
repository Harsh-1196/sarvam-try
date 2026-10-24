import { GitFork, Check, AlertTriangle, Layers, HelpCircle } from 'lucide-react';
import type { Perspective, Source } from '../types';
import { CitationChip } from './CitationChip';

interface PerspectivesProps {
  perspectives: Perspective[];
  sources: Source[];
  onSelectCitation: (sourceId: string, quote?: string) => void;
}

export function Perspectives({ perspectives, sources, onSelectCitation }: PerspectivesProps) {
  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  const getStatusBadge = (status: Perspective['status']) => {
    switch (status) {
      case 'agreement':
        return {
          label: 'Cross-Source Agreement',
          icon: <Check className="w-3.5 h-3.5" />,
          classes: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'different_emphasis':
        return {
          label: 'Different Emphasis',
          icon: <Layers className="w-3.5 h-3.5" />,
          classes: 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        };
      case 'factual_conflict':
        return {
          label: 'Factual Conflict',
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          classes: 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 font-bold',
        };
      case 'insufficient_evidence':
      default:
        return {
          label: 'Insufficient Evidence',
          icon: <HelpCircle className="w-3.5 h-3.5" />,
          classes: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  if (!perspectives || perspectives.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <GitFork className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-100">
          Cross-Source Perspectives &amp; Analysis
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
          {perspectives.length} Topics
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {perspectives.map((p, idx) => {
          const badge = getStatusBadge(p.status);

          return (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug" dir="auto">
                  {p.topic}
                </h4>
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium border shadow-xs ${badge.classes}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
              </div>

              {/* Positions List */}
              <div className="space-y-3 pt-2">
                {p.positions.map((pos, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {pos.label}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed" dir="auto">
                      {pos.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-medium text-slate-400">Supporting Quotes:</span>
                      {pos.evidence.map((ev, evIdx) => (
                        <CitationChip
                          key={`${ev.source_id}-${evIdx}`}
                          sourceId={ev.source_id}
                          source={sourceMap.get(ev.source_id)}
                          quote={ev.quote}
                          onSelect={onSelectCitation}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
