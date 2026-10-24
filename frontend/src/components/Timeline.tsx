import React, { useState } from 'react';
import { Calendar, AlertCircle, ExternalLink, BookOpen, Sparkles } from 'lucide-react';
import type { TimelineEvent, Source } from '../types';

interface TimelineProps {
  events: TimelineEvent[];
  sources: Source[];
  highlightedEventIndex?: number | null;
  onOpenArticleReader?: (source: Source) => void;
  onSelectCitation?: (sourceId: string, quote?: string) => void;
}

// Fallback high-contrast news editorial illustrations for timeline events
const EDITORIAL_NEWS_IMAGES = [
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
];

export function Timeline({
  events,
  sources,
  highlightedEventIndex,
  onOpenArticleReader,
  onSelectCitation,
}: TimelineProps) {
  const [activeEventIndex, setActiveEventIndex] = useState<number>(0);
  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  // Sync with audio narration highlight if provided
  const selectedIndex =
    highlightedEventIndex !== undefined && highlightedEventIndex !== null && highlightedEventIndex >= 0
      ? highlightedEventIndex
      : activeEventIndex;

  const extractYearOrShortDate = (event: TimelineEvent): string => {
    if (!event.event_date) return 'Timeline';
    if (event.event_date.length >= 4) {
      const year = event.event_date.slice(0, 4);
      // If full date like YYYY-MM-DD, return Month Year or Year
      if (event.event_date.length >= 7) {
        try {
          const d = new Date(event.event_date);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          }
        } catch {
          return year;
        }
      }
      return year;
    }
    return event.event_date;
  };

  const formatPrecisionDate = (event: TimelineEvent): string => {
    if (!event.event_date) return 'Unknown Date';
    if (event.date_precision === 'year') {
      return event.event_date.slice(0, 4);
    }
    if (event.date_precision === 'month') {
      const d = new Date(event.event_date);
      return !isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : event.event_date;
    }
    try {
      const d = new Date(event.event_date);
      return !isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : event.event_date;
    } catch {
      return event.event_date;
    }
  };

  const handleSourceClick = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    const src = sourceMap.get(sourceId);
    if (src && src.url) {
      window.open(src.url, '_blank', 'noopener,noreferrer');
    } else if (onSelectCitation) {
      onSelectCitation(sourceId);
    }
  };

  const handleCardClick = (event: TimelineEvent, idx: number) => {
    setActiveEventIndex(idx);
    if (!onOpenArticleReader) return;
    const primarySourceId = event.evidence[0]?.source_id;
    const src = sourceMap.get(primarySourceId) || sources[0];
    if (src) {
      onOpenArticleReader(src);
    }
  };

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Chronological Event Timeline"
      className="w-full bg-[#F9F4ED] dark:bg-[#1F1D1B] rounded-[32px] p-6 sm:p-10 lg:p-12 border border-[#D8D0C8] dark:border-[#3E3835] space-y-12"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Prominent Centered Heading (Image 2 Structure) */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] text-[#AF695C] tracking-wider uppercase">
          Evidence-Linked Chronology
        </span>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase text-[#2A2A2A] dark:text-[#F9F4ED] tracking-[-0.03em] leading-tight">
          Chronological
          <br className="hidden sm:inline" /> Event Timeline
        </h2>
        <p className="text-xs sm:text-sm text-[#77716D] max-w-xl mx-auto">
          Interactive verified timeline cross-referenced from live news sources. Click any milestone node or card to read the full translated report.
        </p>
      </div>

      {/* =========================================================================
          HORIZONTAL TIMELINE & MILESTONE CARDS (Following Image 2)
      ========================================================================= */}
      <div className="w-full">
        {/* Horizontal Track & Milestone Nodes */}
        <div className="relative mb-8 sm:mb-12 px-2 sm:px-4 overflow-x-auto pb-4 no-scrollbar">
          <div className="min-w-[320px] relative">
            {/* Horizontal Connecting Line between first and last node */}
            <div
              className="absolute top-[34px] -translate-y-1/2 h-[2px] bg-[#D8D0C8] dark:bg-[#3E3835] z-0"
            style={{
              left: `${100 / (events.length * 2)}%`,
              right: `${100 / (events.length * 2)}%`,
            }}
            aria-hidden="true"
          />

          {/* Node Grid across all events */}
          <div
            className="grid gap-4 relative z-10"
            style={{
              gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))`,
            }}
            role="tablist"
            aria-label="Event Milestones"
          >
            {events.map((event, idx) => {
              const isActive = selectedIndex === idx;
              const yearLabel = extractYearOrShortDate(event);

              return (
                <button
                  key={event.id}
                  type="button"
                  role="tab"
                  id={`timeline-tab-${event.id}`}
                  aria-selected={isActive}
                  aria-controls={`timeline-panel-${event.id}`}
                  onClick={() => setActiveEventIndex(idx)}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AF695C] rounded-xl py-1 transition-transform"
                >
                  {/* Year/Date Label above the node */}
                  <span
                    className={`text-xs sm:text-sm tracking-tight transition-colors duration-200 mb-3 truncate max-w-[140px] text-center ${
                      isActive
                        ? 'text-[#AF695C] font-bold scale-105'
                        : 'text-[#77716D] font-medium group-hover:text-[#2A2A2A] dark:group-hover:text-[#F9F4ED]'
                    }`}
                  >
                    {yearLabel}
                  </span>

                  {/* Timeline Node Dot */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'bg-[#AF695C] ring-4 ring-[#AF695C]/25 scale-110 shadow-sm'
                        : 'bg-[#EDEAEA] dark:bg-[#282523] border-2 border-[#D8D0C8] dark:border-[#3E3835] group-hover:border-[#AF695C] group-hover:bg-[#F9F4ED]'
                    }`}
                  >
                    {isActive && <div className="w-2 h-2 rounded-full bg-[#F9F4ED]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Milestone Cards Grid (beneath the timeline nodes) */}
        <div
          className={`grid gap-6 lg:gap-8 items-stretch ${
            events.length === 1
              ? 'grid-cols-1 max-w-xl mx-auto'
              : events.length === 2
              ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
              : events.length === 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {events.map((event, idx) => {
            const isActive = selectedIndex === idx;
            const dateLabel = formatPrecisionDate(event);
            const isUnverified = event.verification === 'unverified';

            // Resolve image for this event
            let eventImg = event.image_url;
            if (!eventImg) {
              for (const ev of event.evidence) {
                const s = sourceMap.get(ev.source_id);
                if (s && s.image_url) {
                  eventImg = s.image_url;
                  break;
                }
              }
            }
            if (!eventImg) {
              eventImg = EDITORIAL_NEWS_IMAGES[idx % EDITORIAL_NEWS_IMAGES.length];
            }

            return (
              <div
                key={event.id}
                id={`timeline-panel-${event.id}`}
                role="tabpanel"
                aria-labelledby={`timeline-tab-${event.id}`}
                tabIndex={0}
                onClick={() => handleCardClick(event, idx)}
                className={`rounded-[28px] p-6 lg:p-7 flex flex-col justify-between transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AF695C] group/card ${
                  isActive
                    ? 'bg-[#F9F4ED] dark:bg-[#1F1D1B] border-2 border-[#AF695C] shadow-md transform -translate-y-1'
                    : 'bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] hover:border-[#AF695C] hover:-translate-y-0.5'
                }`}
              >
                <div className="space-y-4">
                  {/* Article Thumbnail Image */}
                  <div className="w-full h-36 rounded-2xl overflow-hidden relative bg-stone-900 shadow-inner">
                    <img
                      src={eventImg}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = EDITORIAL_NEWS_IMAGES[0];
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                      <span className="text-[10px] font-mono text-white/90 bg-black/50 backdrop-blur px-2 py-0.5 rounded-lg border border-white/10 flex items-center space-x-1">
                        <BookOpen className="w-2.5 h-2.5 text-[#AF695C]" />
                        <span>Click to Read</span>
                      </span>
                    </div>
                  </div>

                  {/* Header: Milestone Label and Date */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs uppercase font-semibold tracking-wider ${
                          isActive ? 'text-[#AF695C]' : 'text-[#77716D]'
                        }`}
                      >
                        Milestone {idx + 1}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#AF695C]/15 text-[#AF695C]">
                          Selected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-[#77716D] mb-2">
                      <Calendar className="w-3.5 h-3.5 text-[#AF695C]" />
                      <span className="font-medium">{dateLabel}</span>
                    </div>

                    {isUnverified && (
                      <div className="mb-2 inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#AF695C]/10 text-[#AF695C] border border-[#AF695C]/20">
                        <AlertCircle className="w-3 h-3 text-[#AF695C]" />
                        <span>Unverified Details</span>
                      </div>
                    )}

                    <h3
                      className={`text-lg sm:text-xl font-bold tracking-tight leading-snug ${
                        isActive ? 'text-[#2A2A2A] dark:text-[#F9F4ED]' : 'text-[#2A2A2A] dark:text-[#EDEAEA]'
                      }`}
                      dir="auto"
                    >
                      {event.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p
                    className={`text-xs sm:text-sm leading-relaxed ${
                      isActive ? 'text-[#2A2A2A] dark:text-[#EDEAEA]' : 'text-[#77716D]'
                    }`}
                    dir="auto"
                  >
                    {event.description}
                  </p>
                </div>

                {/* Sources Row with thin divider */}
                <div className="pt-4 mt-4 border-t border-[#D8D0C8] dark:border-[#3E3835] space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#77716D]">
                      Sources:
                    </span>
                    {event.evidence.map((ev, i) => {
                      const s = sourceMap.get(ev.source_id);
                      return (
                        <button
                          key={`${ev.source_id}-${i}`}
                          type="button"
                          onClick={(e) => handleSourceClick(e, ev.source_id)}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-[#F9F4ED] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] text-[#2A2A2A] dark:text-[#EDEAEA] hover:border-[#AF695C] hover:text-[#AF695C] shadow-sm transition"
                          title={s?.url ? `Open external report on ${s.publisher || 'publisher website'}` : 'View source'}
                        >
                          <span className="font-mono text-[#AF695C] font-bold">[{ev.source_id}]</span>
                          <span className="max-w-[90px] truncate">{s?.publisher || s?.title || 'Source'}</span>
                          {s?.url && <ExternalLink className="w-2.5 h-2.5 text-[#77716D]" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-[#AF695C] pt-1">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Read Full Report</span>
                    </span>
                    <span className="group-hover/card:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </section>
  );
}
