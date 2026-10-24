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
    <div className="max-w-4xl mx-auto w-full space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Story Masthead Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {story.newspaper_date && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
              <Calendar className="w-3.5 h-3.5" />
              <span>Publication Date: {story.newspaper_date}</span>
            </div>
          )}

          {/* Read Story Aloud Button */}
          <button
            onClick={handleReadStoryAloud}
            disabled={isSynthesizingStory}
            className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:opacity-95 text-white shadow-md shadow-rose-500/20 transition disabled:opacity-50 cursor-pointer"
          >
            {isSynthesizingStory ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isSynthesizingStory ? 'Generating Speech...' : 'Read Story Aloud'}</span>
          </button>
        </div>

        <h2 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-tight" dir="auto">
          {story.headline}
        </h2>

        {/* Story Audio Player when generated */}
        {storyAudioBase64 && (
          <AudioControls base64Audio={storyAudioBase64} mimeType="audio/wav" autoPlay={true} />
        )}

        {/* Notices Banner (Collapsible if present) */}
        {story.notices && story.notices.length > 0 && (
          <div className="mt-4 rounded-2xl bg-slate-100/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden text-xs">
            <button
              onClick={() => setShowNotices(!showNotices)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            >
              <span className="flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>Verification &amp; Pipeline Notices ({story.notices.length})</span>
              </span>
              {showNotices ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showNotices && (
              <ul className="px-4 pb-3 space-y-1.5 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 pt-2 list-disc list-inside">
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
        <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-white/10">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-slate-100">
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
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2.5 shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
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
