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
    <div
      className="sticky bottom-0 z-30 pt-2 pb-4 bg-gradient-to-t from-[#F9F4ED] via-[#F9F4ED]/95 to-transparent dark:from-[#1F1D1B] dark:via-[#1F1D1B]/95 backdrop-blur-sm"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <div className="max-w-4xl mx-auto px-4">
        {recorderError && (
          <div className="mb-2 p-3 rounded-2xl bg-[#AF695C]/10 border border-[#AF695C]/30 text-[#AF695C] text-xs flex items-center space-x-2 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#AF695C]" />
            <span>{recorderError}</span>
          </div>
        )}

        <div className="p-2 sm:p-2.5 rounded-[26px] bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] shadow-md flex items-center space-x-2">
          {/* Mic Toggle Button */}
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isLoading}
            aria-label={isRecording ? 'Stop voice recording' : 'Start voice question'}
            className={`p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isRecording
                ? 'bg-[#AF695C] text-[#F9F4ED] animate-pulse ring-4 ring-[#AF695C]/25 shadow-md'
                : 'bg-[#F9F4ED] dark:bg-[#1F1D1B] text-[#2A2A2A] dark:text-[#EDEAEA] border border-[#D8D0C8] dark:border-[#3E3835] hover:border-[#AF695C] hover:text-[#AF695C] transition-colors'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {isRecording ? (
            <div className="flex-1 px-3 flex items-center justify-between text-xs sm:text-sm font-medium text-[#AF695C] animate-pulse">
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#AF695C]" />
                <span>Listening with Sarvam Saaras v4... Speak your question</span>
              </span>
              <span className="font-mono font-bold bg-[#F9F4ED] dark:bg-[#1F1D1B] text-[#AF695C] px-2.5 py-1 rounded-full border border-[#AF695C]/30">
                00:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds} / 00:30
              </span>
            </div>
          ) : isLoading ? (
            <div className="flex-1 px-3 flex items-center space-x-2.5 text-xs sm:text-sm text-[#AF695C] font-medium animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-[#AF695C]" />
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
                className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent border-0 text-[#2A2A2A] dark:text-[#F9F4ED] focus:outline-none placeholder:text-[#77716D]"
              />

              {/* Language Selector in Ask Bar */}
              <div className="hidden sm:flex items-center space-x-1.5 pl-2.5 border-l border-[#D8D0C8] dark:border-[#3E3835]">
                <Globe className="w-3.5 h-3.5 text-[#77716D]" />
                <select
                  value={displayLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-[#2A2A2A] dark:text-[#EDEAEA] focus:outline-none pr-1 cursor-pointer"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-[#F9F4ED] dark:bg-[#1F1D1B] text-[#2A2A2A] dark:text-[#F9F4ED]">
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
                className="p-2.5 sm:p-3 rounded-2xl bg-[#AF695C] hover:bg-[#99594D] disabled:opacity-40 disabled:cursor-not-allowed text-[#F9F4ED] transition shadow-sm cursor-pointer"
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
