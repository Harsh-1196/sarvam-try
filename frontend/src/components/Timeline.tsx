import { Calendar, AlertCircle, Clock, ExternalLink, BookOpen, Sparkles } from 'lucide-react';
import type { TimelineEvent, Source } from '../types';

interface TimelineProps {
  events: TimelineEvent[];
  sources: Source[];
  onOpenArticleReader?: (source: Source) => void;
  onSelectCitation?: (sourceId: string, quote?: string) => void;
}

// Fallback high-contrast news editorial illustrations for timeline events
const EDITORIAL_NEWS_IMAGES = [
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80', // Newspaper / Newsroom
  'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80', // Renewable solar
  'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=800&q=80', // Clean energy wind
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', // Global technology
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80', // Financial / Economy
];

export function Timeline({ events, sources, onOpenArticleReader, onSelectCitation }: TimelineProps) {
  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  const formatPrecisionDate = (event: TimelineEvent): string => {
    if (!event.event_date) return 'Unknown Date';
    if (event.date_precision === 'year') {
      return event.event_date.slice(0, 4);
    }
    if (event.date_precision === 'month') {
      const d = new Date(event.event_date);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return event.event_date;
  };

  const handleSourceClick = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation(); // Do not trigger card click
    const src = sourceMap.get(sourceId);
    if (src && src.url) {
      // Direct user to actual live web article in a new tab (User Request #6)
      window.open(src.url, '_blank', 'noopener,noreferrer');
    } else if (onSelectCitation) {
      onSelectCitation(sourceId);
    }
  };

  const handleCardClick = (event: TimelineEvent) => {
    if (!onOpenArticleReader) return;
    // Find the primary evidence source for this timeline event
    const primarySourceId = event.evidence[0]?.source_id;
    const src = sourceMap.get(primarySourceId) || sources[0];
    if (src) {
      onOpenArticleReader(src);
    }
  };

  return (
    <div className="space-y-6">
      {/* Timeline Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-serif font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-50 tracking-tight">
            Chronological Event Timeline
          </h3>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono font-semibold">
            {events.length} Events
          </span>
        </div>

        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hidden sm:inline-block">
          Click any card to read full translated article &amp; audio summary
        </span>
      </div>

      <div className="relative pl-6 sm:pl-8 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-8">
        {events.map((event, idx) => {
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
            <div key={event.id} className="relative group">
              {/* Timeline Node Dot */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-2.5 w-4 h-4 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-950 group-hover:scale-125 group-hover:border-rose-500 transition-all duration-200 shadow-sm" />

              {/* Event Card (Clickable to open Reader Panel) */}
              <div
                onClick={() => handleCardClick(event)}
                className="rounded-3xl glass-card glass-card-interactive border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group/card flex flex-col sm:flex-row"
              >
                {/* Event Article Visual Image (User Request #5) */}
                <div className="sm:w-56 md:w-64 h-48 sm:h-auto relative overflow-hidden bg-slate-900 flex-shrink-0">
                  <img
                    src={eventImg}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to editorial placeholder if image link breaks
                      (e.target as HTMLImageElement).src = EDITORIAL_NEWS_IMAGES[0];
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[11px] font-mono text-white/90 bg-black/50 backdrop-blur px-2 py-0.5 rounded-lg border border-white/10 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3 text-indigo-400" />
                      <span>Click to Read</span>
                    </span>
                  </div>
                </div>

                {/* Event Content Body */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Header Badge Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                          {event.id}
                        </span>
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{dateLabel}</span>
                        </span>
                      </div>

                      {isUnverified && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span>Unverified Details</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h4 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-slate-50 group-hover/card:text-indigo-600 dark:group-hover/card:text-indigo-400 transition-colors leading-snug" dir="auto">
                      {event.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed" dir="auto">
                      {event.description}
                    </p>
                  </div>

                  {/* Sources Row (Clicking goes directly to publisher website - User Request #6) */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
                        Sources:
                      </span>
                      {event.evidence.map((ev, i) => {
                        const s = sourceMap.get(ev.source_id);
                        return (
                          <button
                            key={`${ev.source_id}-${i}`}
                            type="button"
                            onClick={(e) => handleSourceClick(e, ev.source_id)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition"
                            title={s?.url ? `Open external article on ${s.publisher || 'publisher website'}` : 'View source'}
                          >
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">[{ev.source_id}]</span>
                            <span className="max-w-[120px] truncate">{s?.publisher || s?.title || 'Source'}</span>
                            {s?.url && <ExternalLink className="w-2.5 h-2.5 text-slate-400" />}
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1 group-hover/card:translate-x-1 transition-transform">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Read Full Article &amp; Audio Summary →</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
