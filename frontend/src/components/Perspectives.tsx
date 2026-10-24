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
          icon: <Check className="w-3.5 h-3.5 text-[#AF695C]" />,
          classes: 'bg-[#F9F4ED] dark:bg-[#1F1D1B] text-[#2A2A2A] dark:text-[#F9F4ED] border border-[#D8D0C8] dark:border-[#3E3835]',
        };
      case 'different_emphasis':
        return {
          label: 'Different Emphasis',
          icon: <Layers className="w-3.5 h-3.5 text-[#AF695C]" />,
          classes: 'bg-[#AF695C]/10 text-[#AF695C] border border-[#AF695C]/30',
        };
      case 'factual_conflict':
        return {
          label: 'Factual Conflict',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#AF695C]" />,
          classes: 'bg-[#AF695C] text-[#F9F4ED] border border-[#AF695C] font-bold',
        };
      case 'insufficient_evidence':
      default:
        return {
          label: 'Insufficient Evidence',
          icon: <HelpCircle className="w-3.5 h-3.5 text-[#77716D]" />,
          classes: 'bg-[#EDEAEA] dark:bg-[#282523] text-[#77716D] border border-[#D8D0C8] dark:border-[#3E3835]',
        };
    }
  };

  if (!perspectives || perspectives.length === 0) return null;

  return (
    <div className="space-y-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center space-x-2 pb-2 border-b border-[#D8D0C8] dark:border-[#3E3835]">
        <GitFork className="w-5 h-5 text-[#AF695C]" />
        <h3 className="font-bold text-lg sm:text-xl text-[#2A2A2A] dark:text-[#F9F4ED]">
          Cross-Source Perspectives &amp; Analysis
        </h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] text-[#AF695C] font-mono">
          {perspectives.length} Topics
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {perspectives.map((p, idx) => {
          const badge = getStatusBadge(p.status);

          return (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-[28px] bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-base sm:text-lg font-bold text-[#2A2A2A] dark:text-[#F9F4ED] leading-snug" dir="auto">
                  {p.topic}
                </h4>
                <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs ${badge.classes}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
              </div>

              {/* Positions List */}
              <div className="space-y-3 pt-2">
                {p.positions.map((pos, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-5 rounded-[22px] bg-[#F9F4ED] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#AF695C]">
                        {pos.label}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#2A2A2A] dark:text-[#EDEAEA] leading-relaxed" dir="auto">
                      {pos.summary}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#D8D0C8]/60 dark:border-[#3E3835]/60 mt-3">
                      <span className="text-[11px] font-medium text-[#77716D]">Supporting Quotes:</span>
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
