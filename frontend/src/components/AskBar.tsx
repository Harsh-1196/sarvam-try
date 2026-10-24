import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Globe, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useRecorder } from '../hooks/useRecorder';
import { LANGUAGES } from '../lib/languages';

interface AskBarProps {
  onAsk: (params: { text?: string; audioBlob?: Blob }) => void;
  isLoading: boolean;
  displayLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export function AskBar({ onAsk, isLoading, displayLanguage, onLanguageChange }: AskBarProps) {
  const [inputText, setInputText] = useState('');
  const {
    isRecording,
    recordingSeconds,
    audioBlob,
    error: recorderError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useRecorder(30);

  const onAskRef = useRef(onAsk);
  onAskRef.current = onAsk;

  // When recording stops and audioBlob is ready, trigger submit automatically
  useEffect(() => {
    if (audioBlob) {
      onAskRef.current({ audioBlob });
      const timer = setTimeout(() => {
        resetRecording();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [audioBlob, resetRecording]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || isRecording) return;
    onAsk({ text: inputText.trim() });
    setInputText('');
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="sticky bottom-0 z-30 pt-2 pb-4 bg-gradient-to-t from-slate-50/95 via-slate-50/90 to-transparent dark:from-slate-950/95 dark:via-slate-950/90 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4">
        {recorderError && (
          <div className="mb-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center space-x-2 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{recorderError}</span>
          </div>
        )}

        <div className="p-2 sm:p-2.5 rounded-3xl glass-card border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-950/5 flex items-center space-x-2">
          {/* Mic Toggle Button */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isLoading}
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice question'}
            className={`p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/25 shadow-lg shadow-rose-600/30'
                : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {isRecording ? (
            <div className="flex-1 px-3 flex items-center justify-between text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 animate-pulse">
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Listening with Sarvam Saaras v4... Speak your question</span>
              </span>
              <span className="font-mono font-bold bg-rose-50 dark:bg-rose-950/80 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-900">
                00:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds} / 00:30
              </span>
            </div>
          ) : isLoading ? (
            <div className="flex-1 px-3 flex items-center space-x-2.5 text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Transcribing &amp; reasoning across sources with Sarvam AI...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitText} className="flex-1 flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={500}
                dir="auto"
                disabled={isLoading}
                placeholder="Ask any question grounded in the story and sources..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent border-0 text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />

              {/* Language Selector in Ask Bar */}
              <div className="hidden sm:flex items-center space-x-1.5 pl-2.5 border-l border-slate-200 dark:border-white/10">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={displayLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none pr-1 cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                aria-label="Send question"
                className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-md shadow-rose-500/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
