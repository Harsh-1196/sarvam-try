import { useEffect, useState } from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  Search, 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Globe2,
  Scan,
  Cpu
} from 'lucide-react';
import type { PipelineStage } from '../types';

interface StageConfig {
  key: PipelineStage;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  detail: string;
}

const OCR_STAGES: StageConfig[] = [
  { 
    key: 'ocr', 
    label: 'Digitizing & OCR', 
    shortLabel: 'OCR Scan',
    icon: Scan,
    description: 'Digitizing layout, columns, and Indic script with Sarvam Vision',
    detail: 'Document intelligence extracting structured reading blocks and masthead'
  },
];

const STORY_STAGES: StageConfig[] = [
  { 
    key: 'search', 
    label: 'Web Discovery', 
    shortLabel: 'Search',
    icon: Search,
    description: 'Discovering corroborating news coverage via Tavily Search',
    detail: 'Targeted date-window queries querying major Indian & international portals'
  },
  { 
    key: 'extract', 
    label: 'Article Ingestion', 
    shortLabel: 'Ingest',
    icon: FileText,
    description: 'Extracting full publisher content & shingle deduplication',
    detail: '5-word shingle clustering groups wire syndications into unified clusters'
  },
  { 
    key: 'pivot', 
    label: 'Language Alignment', 
    shortLabel: 'Pivot',
    icon: Globe2,
    description: 'Applying Sarvam Translate pivot pipelines where necessary',
    detail: 'Normalizing 23 Indic languages into model comprehension space'
  },
  { 
    key: 'generate', 
    label: 'Story Synthesis', 
    shortLabel: 'Synthesize',
    icon: Sparkles,
    description: 'Sarvam-105B building chronological timeline & perspectives',
    detail: 'Reasoning across S0..S5 sources with strict verbatim citation grounding'
  },
  { 
    key: 'validate', 
    label: 'Evidence Verification', 
    shortLabel: 'Verify',
    icon: ShieldCheck,
    description: 'Validating NFKC verbatim quote matches and temporal order',
    detail: 'Pruning unverified claims and downgrading single-cluster perspectives'
  },
];

interface ProgressStagesProps {
  currentStage: string;
  mode?: 'ocr' | 'story';
}

export function ProgressStages({ currentStage, mode = 'story' }: ProgressStagesProps) {
  const [elapsed, setElapsed] = useState(0);
  const stages = mode === 'ocr' ? OCR_STAGES : STORY_STAGES;
  
  // Allow user to click any stage node to inspect details
  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentIndex = stages.findIndex((s) => s.key === currentStage);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const inspectedIndex = selectedStageIndex !== null ? selectedStageIndex : activeIndex;
  const inspectedStage = stages[inspectedIndex] || stages[0];

  // Calculate overall progress percentage
  const progressPercent = Math.min(100, Math.round(((activeIndex + 0.5) / stages.length) * 100));

  return (
    <div className="max-w-4xl mx-auto w-full p-6 sm:p-8 rounded-3xl glass-card border border-slate-200/80 dark:border-white/10 shadow-2xl animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-white/5 gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-50 tracking-tight">
              {mode === 'ocr' ? 'Analyzing Newspaper Scan' : 'Building Evidence-Linked Story'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sarvam AI Multilingual Reasoning &amp; Evidence Validation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span>{elapsed}s elapsed</span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Horizontal Interactive Stepper */}
      <div className="py-8">
        <div className="relative">
          {/* Background Connecting Bar */}
          <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 rounded-full z-0 hidden sm:block" />

          {/* Active Progress Gradient Bar */}
          <div 
            className="absolute top-1/2 left-4 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 rounded-full z-0 transition-all duration-700 hidden sm:block"
            style={{ width: `calc(${progressPercent}% - 2rem)` }}
          />

          {/* Stepper Nodes */}
          <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-4 sm:gap-2 relative z-10">
            {stages.map((stage, idx) => {
              const isDone = currentIndex > idx;
              const isCurrent = currentIndex === idx || (currentIndex === -1 && idx === 0);
              const isInspected = inspectedIndex === idx;
              const IconComp = stage.icon;

              return (
                <button
                  type="button"
                  key={stage.key}
                  onClick={() => setSelectedStageIndex(idx)}
                  className={`flex flex-col items-center text-center p-3 rounded-2xl transition-all cursor-pointer group ${
                    isInspected 
                      ? 'bg-slate-100/90 dark:bg-white/10 ring-2 ring-indigo-500/50 scale-105' 
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {/* Node Circle */}
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                        : isCurrent
                        ? 'bg-gradient-to-tr from-amber-500 to-rose-600 text-white ring-4 ring-rose-500/20 animate-subtle-pulse'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <IconComp className="w-5 h-5" />
                    )}
                  </div>

                  {/* Stage Labels */}
                  <span
                    className={`text-xs font-bold mt-2.5 transition-colors ${
                      isCurrent
                        ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                        : isDone
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {stage.shortLabel}
                  </span>
                  
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">
                    Step {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Micro-Details Panel */}
      <div className="p-4.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/30 to-amber-50/20 dark:from-slate-900/90 dark:via-indigo-950/20 dark:to-slate-900/90 border border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 shadow-sm">
            <inspectedStage.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {inspectedStage.label}
              </span>
              {inspectedIndex === activeIndex && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                  Live Stage
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {inspectedStage.description}
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          {inspectedStage.detail}
        </div>
      </div>
    </div>
  );
}
