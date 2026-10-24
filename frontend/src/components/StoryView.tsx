import { useState } from 'react';
import { Volume2, AlertCircle, ChevronDown, ChevronUp, MessageSquare, Loader2, Calendar } from 'lucide-react';
import type { Story, Source, QARecord } from '../types';
import { Timeline } from './Timeline';
import { Perspectives } from './Perspectives';
import { SourceDrawer } from './SourceDrawer';
import { ArticleReaderModal } from './ArticleReaderModal';
import { AskBar } from './AskBar';
import { AnswerCard } from './AnswerCard';
import { AudioControls } from './AudioControls';
import { api } from '../api/client';

interface StoryViewProps {
  story: Story;
  sessionId: string;
  displayLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export function StoryView({ story, sessionId, displayLanguage, onLanguageChange }: StoryViewProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [highlightQuote, setHighlightQuote] = useState<string | undefined>(undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showNotices, setShowNotices] = useState(false);

  // Article Reader Modal State
  const [readerSource, setReaderSource] = useState<Source | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  // Q&A History & Error
  const [qaHistory, setQaHistory] = useState<QARecord[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  // Story Read-Aloud Audio
  const [storyAudioBase64, setStoryAudioBase64] = useState<string | null>(null);
  const [isSynthesizingStory, setIsSynthesizingStory] = useState(false);

  const handleSelectCitation = (sourceId: string, quote?: string) => {
    setSelectedSourceId(sourceId);
    setHighlightQuote(quote);
    setIsDrawerOpen(true);
  };

  const handleOpenArticleReader = (source: Source) => {
    setReaderSource(source);
    setIsReaderOpen(true);
  };

  const selectedSource: Source | null =
    story.sources.find((s) => s.id === selectedSourceId) || null;

  const handleReadStoryAloud = async () => {
    if (storyAudioBase64) return;
    setIsSynthesizingStory(true);
    try {
      // Build brief summary: first 3 events
      const summaryEvents = story.timeline.slice(0, 3);
      const textToRead = `${story.headline}. ` + summaryEvents.map((e) => `${e.title}. ${e.description}`).join(' ');
      const res = await api.tts({
        sessionId,
        text: textToRead,
        language: displayLanguage,
      });
      setStoryAudioBase64(res.base64);
    } catch (err) {
      console.error('Failed to synthesize story read aloud:', err);
    } finally {
      setIsSynthesizingStory(false);
    }
  };

  const handleAsk = async (params: { text?: string; audioBlob?: Blob }) => {
    setIsAnswering(true);
    setQaError(null);
    try {
      const res = await api.ask({
        sessionId,
        displayLanguage,
        text: params.text,
        audioBlob: params.audioBlob,
        wantAudio: true,
      });

      const newRecord: QARecord = {
        id: `qa-${Date.now()}`,
        question: params.text || res.transcript || 'Voice Question',
        transcript: res.transcript,
        answer: res.answer,
        source_ids: res.source_ids,
        insufficient_evidence: res.insufficient_evidence,
        audio: res.audio,
        audio_unavailable_reason: res.audio_unavailable_reason,
        timestamp: new Date().toLocaleTimeString(),
      };

      setQaHistory((prev) => [...prev, newRecord]);
    } catch (err: any) {
      console.error('Q&A error:', err);
      setQaError(err.message || 'Could not process audio question. Please speak clearly or type your question.');
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8 pb-16 animate-in fade-in duration-300" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Story Masthead Card */}
      <div className="p-6 sm:p-8 rounded-[28px] bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {story.newspaper_date && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#AF695C]/10 text-[#AF695C] border border-[#AF695C]/20 font-mono">
              <Calendar className="w-3.5 h-3.5 text-[#AF695C]" />
              <span>Publication Date: {story.newspaper_date}</span>
            </div>
          )}

          {/* Read Story Aloud Button */}
          <button
            onClick={handleReadStoryAloud}
            disabled={isSynthesizingStory}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold bg-[#AF695C] hover:bg-[#99594D] text-[#F9F4ED] shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isSynthesizingStory ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isSynthesizingStory ? 'Generating Speech...' : 'Read Story Aloud'}</span>
          </button>
        </div>

        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[#2A2A2A] dark:text-[#F9F4ED] leading-tight" dir="auto">
          {story.headline}
        </h2>

        {/* Story Audio Player when generated */}
        {storyAudioBase64 && (
          <AudioControls base64Audio={storyAudioBase64} mimeType="audio/wav" autoPlay={true} />
        )}

        {/* Notices Banner (Collapsible if present) */}
        {story.notices && story.notices.length > 0 && (
          <div className="mt-4 rounded-2xl bg-[#F9F4ED] dark:bg-[#1F1D1B] border border-[#D8D0C8] dark:border-[#3E3835] overflow-hidden text-xs">
            <button
              onClick={() => setShowNotices(!showNotices)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-[#77716D] hover:text-[#2A2A2A] dark:hover:text-[#F9F4ED]"
            >
              <span className="flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 text-[#AF695C]" />
                <span>Verification &amp; Pipeline Notices ({story.notices.length})</span>
              </span>
              {showNotices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showNotices && (
              <ul className="px-4 pb-3 space-y-1.5 text-[#77716D] border-t border-[#D8D0C8] dark:border-[#3E3835] pt-2 list-disc list-inside">
                {story.notices.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <Timeline
        events={story.timeline}
        sources={story.sources}
        onOpenArticleReader={handleOpenArticleReader}
        onSelectCitation={handleSelectCitation}
      />

      {/* Perspectives Section */}
      <Perspectives
        perspectives={story.perspectives}
        sources={story.sources}
        onSelectCitation={handleSelectCitation}
      />

      {/* Q&A History Section */}
      {qaHistory.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#D8D0C8] dark:border-[#3E3835]">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-[#AF695C]" />
            <h3 className="font-bold text-lg text-[#2A2A2A] dark:text-[#F9F4ED]">
              Spoken &amp; Written Q&amp;A History
            </h3>
          </div>

          <div className="space-y-4">
            {qaHistory.map((rec) => (
              <AnswerCard
                key={rec.id}
                record={rec}
                sources={story.sources}
                onSelectCitation={handleSelectCitation}
              />
            ))}
          </div>
        </div>
      )}

      {/* Source Detail Drawer (For Citation Quotes) */}
      <SourceDrawer
        source={selectedSource}
        highlightQuote={highlightQuote}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Full Article Reader & Translation Modal (User Request #7) */}
      <ArticleReaderModal
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        source={readerSource}
        sessionId={sessionId}
        displayLanguage={displayLanguage}
      />

      {/* QA Error Feedback Banner */}
      {qaError && (
        <div className="p-3.5 rounded-2xl bg-[#AF695C]/10 border border-[#AF695C]/30 text-[#AF695C] text-xs flex items-center space-x-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#AF695C]" />
          <span>{qaError}</span>
        </div>
      )}

      {/* Pinned Ask Bar at Bottom */}
      <AskBar
        onAsk={handleAsk}
        isLoading={isAnswering}
        displayLanguage={displayLanguage}
        onLanguageChange={onLanguageChange}
      />
    </div>
  );
}
