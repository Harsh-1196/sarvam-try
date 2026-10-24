import { HelpCircle, User, Bot } from 'lucide-react';
import type { QARecord, Source } from '../types';
import { CitationChip } from './CitationChip';
import { AudioControls } from './AudioControls';

interface AnswerCardProps {
  record: QARecord;
  sources: Source[];
  onSelectCitation: (sourceId: string, quote?: string) => void;
}

export function AnswerCard({ record, sources, onSelectCitation }: AnswerCardProps) {
  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  return (
    <div
      className="p-5 sm:p-6 rounded-[28px] bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] shadow-sm space-y-4"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* User Question */}
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 rounded-xl bg-[#F9F4ED] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] text-[#2A2A2A] dark:text-[#F9F4ED] flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#2A2A2A] dark:text-[#F9F4ED]" dir="auto">
            {record.question}
          </p>
          {record.transcript && (
            <p className="text-[11px] text-[#AF695C] font-medium mt-0.5">
              Transcribed via Sarvam Saaras v4
            </p>
          )}
        </div>
      </div>

      {/* Model Answer */}
      <div className="flex items-start space-x-3 pt-3 border-t border-[#D8D0C8] dark:border-[#3E3835]">
        <div className="w-8 h-8 rounded-xl bg-[#AF695C] text-[#F9F4ED] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <Bot className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          {record.insufficient_evidence && (
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#AF695C]/10 text-[#AF695C] border border-[#AF695C]/25">
              <HelpCircle className="w-3.5 h-3.5 text-[#AF695C]" />
              <span>Insufficient Evidence in Sources</span>
            </div>
          )}

          <p className="text-sm text-[#2A2A2A] dark:text-[#EDEAEA] leading-relaxed" dir="auto">
            {record.answer}
          </p>

          {/* Citations */}
          {record.source_ids.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-medium text-[#77716D]">Cited Sources:</span>
              {record.source_ids.map((sid) => (
                <CitationChip
                  key={sid}
                  sourceId={sid}
                  source={sourceMap.get(sid)}
                  onSelect={onSelectCitation}
                />
              ))}
            </div>
          )}

          {/* Voice Output Audio Controls */}
          {record.audio ? (
            <AudioControls
              base64Audio={record.audio.base64}
              mimeType={record.audio.mime}
              autoPlay={true}
            />
          ) : record.audio_unavailable_reason ? (
            <p className="text-[11px] text-[#77716D] italic mt-1">
              Audio narration unavailable: {record.audio_unavailable_reason}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
