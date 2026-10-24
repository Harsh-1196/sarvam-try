import { useState, useEffect, useCallback, useRef } from 'react';
import { Newspaper, Activity, Moon, Sun, Sparkles, RefreshCw, FileText } from 'lucide-react';
import { api } from './api/client';
import type { HealthStatus, AppStage, HeadlineCandidate, Story } from './types';
import { UploadScreen } from './components/UploadScreen';
import { ProgressStages } from './components/ProgressStages';
import { HeadlinePicker } from './components/HeadlinePicker';
import { StoryView } from './components/StoryView';
import { ErrorBanner } from './components/ErrorBanner';
import { usePolling } from './hooks/usePolling';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  // App Workflow State
  const [stage, setStage] = useState<AppStage>('upload');
  const [pipelineStage, setPipelineStage] = useState<string>('ocr');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<{ code?: string; message: string; retryable?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const uploadInFlight = useRef(false);

  // OCR results
  const [candidates, setCandidates] = useState<HeadlineCandidate[]>([]);
  const [detectedDate, setDetectedDate] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [ocrExcerpt, setOcrExcerpt] = useState<string | null>(null);

  // Story state
  const [selectedHeadline, setSelectedHeadline] = useState<string>('');
  const [displayLanguage, setDisplayLanguage] = useState<string>('hi-IN');
  const [story, setStory] = useState<Story | null>(null);
  const [canUseNewspaperOnly, setCanUseNewspaperOnly] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    api.getHealth()
      .then((data) => {
        setHealth(data);
        setHealthError(null);
      })
      .catch((err) => {
        setHealthError(err.message || 'Cannot connect to backend server');
      });
  }, []);

  // Poll newspaper status during OCR stage
  const pollNewspaper = useCallback(async () => {
    if (!sessionId || stage !== 'ocr') return true;
    try {
      const res = await api.getNewspaperStatus(sessionId);
      setPipelineStage(res.stage);

      if (res.status === 'ready') {
        setCandidates(res.candidates);
        setDetectedDate(res.newspaper_date || null);
        setDetectedLanguage(res.detected_language || null);
        setOcrExcerpt(res.ocr_text_excerpt || null);
        if (res.detected_language) {
          setDisplayLanguage(res.detected_language);
        }
        setStage('pick_headline');
        setIsLoading(false);
        return true; // Stop polling
      } else if (res.status === 'failed') {
        setError(res.error || { code: 'OCR_FAILED', message: 'Failed to process newspaper photo', retryable: true });
        setIsLoading(false);
        setStage('upload');
        return true;
      }
      return false;
    } catch (err: any) {
      setError({
        code: err.code || 'POLL_ERROR',
        message: err.message || 'Failed to check status',
        retryable: true,
      });
      setIsLoading(false);
      setStage('upload');
      return true;
    }
  }, [sessionId, stage]);

  usePolling(pollNewspaper, { enabled: stage === 'ocr' && !!sessionId, intervalMs: 1500 });

  // Poll story status during story_loading stage
  const pollStory = useCallback(async () => {
    if (!sessionId || stage !== 'story_loading') return true;
    try {
      const res = await api.getStoryStatus(sessionId);
      setPipelineStage(res.stage);

      if (res.status === 'ready' && res.story) {
        setStory(res.story);
        setStage('story');
        setIsLoading(false);
        setCanUseNewspaperOnly(false);
        return true;
      } else if (res.status === 'failed') {
        setIsLoading(false);
        if (res.error?.code === 'NO_SOURCES') {
          setCanUseNewspaperOnly(true);
        }
        setError(res.error || { code: 'STORY_FAILED', message: 'Failed to build verified story', retryable: true });
        return true;
      }
      return false;
    } catch (err: any) {
      setError({
        code: err.code || 'STORY_POLL_ERROR',
        message: err.message || 'Failed to check story status',
        retryable: true,
      });
      setIsLoading(false);
      setStage('pick_headline');
      return true;
    }
  }, [sessionId, stage]);

  usePolling(pollStory, { enabled: stage === 'story_loading' && !!sessionId, intervalMs: 1500 });

  const handleUpload = async (file: File, languageHint?: string) => {
    if (uploadInFlight.current) return;
    uploadInFlight.current = true;
    setRetryFile(file);
    setError(null);
    setIsLoading(true);
    setCanUseNewspaperOnly(false);
    setCandidates([]);
    setDetectedDate(null);
    setDetectedLanguage(null);
    setOcrExcerpt(null);
    setStory(null);
    setSelectedHeadline('');
    setSessionId(null);
    try {
      const res = await api.uploadNewspaper(file, languageHint);
      setSessionId(res.session_id);
      setPipelineStage('ocr');
      setStage('ocr');
    } catch (err: any) {
      setIsLoading(false);
      setError({
        code: err.code || 'UPLOAD_FAILED',
        message: err.message || 'Failed to upload newspaper',
        retryable: err.retryable ?? true,
      });
    } finally {
      uploadInFlight.current = false;
    }
  };

  const handleConfirmHeadline = async (
    headline: string,
    newspaperDate?: string | null,
    chosenLanguage?: string,
    newspaperOnly: boolean = false
  ) => {
    if (!sessionId) return;
    setError(null);
    setIsLoading(true);
    setSelectedHeadline(headline);
    if (chosenLanguage) setDisplayLanguage(chosenLanguage);
    setPipelineStage(newspaperOnly ? 'extract' : 'search');
    setStage('story_loading');
    setCanUseNewspaperOnly(false);

    try {
      await api.createStory({
        session_id: sessionId,
        headline,
        newspaper_date: newspaperDate || detectedDate,
        display_language: chosenLanguage || displayLanguage,
        newspaper_only: newspaperOnly,
      });
    } catch (err: any) {
      setIsLoading(false);
      setError({
        code: err.code || 'STORY_INIT_FAILED',
        message: err.message || 'Failed to start story discovery',
        retryable: err.retryable ?? true,
      });
      setStage('pick_headline');
    }
  };

  const handleReset = () => {
    setStage('upload');
    setSessionId(null);
    setRetryFile(null);
    setError(null);
    setCandidates([]);
    setDetectedDate(null);
    setDetectedLanguage(null);
    setOcrExcerpt(null);
    setStory(null);
    setCanUseNewspaperOnly(false);
    setIsLoading(false);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'mesh-bg-dark text-[#F9F4ED]' : 'mesh-bg-light text-[#2A2A2A]'}`}>
      {/* Top Header */}
      <header className="border-b border-[#D8D0C8] dark:border-[#3E3835] bg-[#F9F4ED]/90 dark:bg-[#1F1D1B]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3.5 cursor-pointer" onClick={handleReset}>
            <div className="w-11 h-11 rounded-2xl bg-[#AF695C] flex items-center justify-center text-[#F9F4ED] shadow-sm">
              <Newspaper className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-xl tracking-tight text-[#2A2A2A] dark:text-[#F9F4ED]">
                  KhabarLens
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#AF695C]/10 text-[#AF695C] border border-[#AF695C]/25">
                  Sarvam AI
                </span>
              </div>
              <p className="text-xs text-[#77716D]">
                Multilingual Evidence-Linked Newspaper Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {stage !== 'upload' && (
              <button
                onClick={handleReset}
                className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#2A2A2A] dark:text-[#EDEAEA] bg-[#EDEAEA] dark:bg-[#282523] hover:bg-[#D8D0C8] border border-[#D8D0C8] dark:border-[#3E3835] transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Photo</span>
              </button>
            )}

            {/* Backend health status badge */}
            <div className="hidden sm:flex items-center space-x-2 text-xs px-3 py-1.5 rounded-full bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] text-[#2A2A2A] dark:text-[#EDEAEA]">
              <Activity className={`w-3.5 h-3.5 ${health?.status === 'ok' ? 'text-[#AF695C] animate-pulse' : 'text-[#77716D]'}`} />
              <span>{health ? `Connected (${health.models.llm})` : healthError ? 'Offline' : 'Connecting...'}</span>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-[#2A2A2A] dark:text-[#EDEAEA] bg-[#EDEAEA] dark:bg-[#282523] hover:bg-[#D8D0C8] border border-[#D8D0C8] dark:border-[#3E3835] transition"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-[#AF695C]" /> : <Moon className="w-4 h-4 text-[#77716D]" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        {error && (
          <div>
            <ErrorBanner
              error={error}
              onRetry={() => {
                if ((stage === 'story_loading' || stage === 'pick_headline') && selectedHeadline && sessionId) {
                  handleConfirmHeadline(selectedHeadline, detectedDate, displayLanguage, false);
                } else if (retryFile) {
                  void handleUpload(retryFile);
                } else {
                  handleReset();
                }
              }}
              onDismiss={() => setError(null)}
            />

            {/* Optional "Use newspaper only" fallback action when 0 sources are found */}
            {canUseNewspaperOnly && (
              <div className="mb-6 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-sky-900 dark:text-sky-200">
                    Build Story from Newspaper Clipping Alone?
                  </h4>
                  <p className="text-xs text-sky-700 dark:text-sky-300 mt-0.5">
                    No web reports were found, but we can synthesize a verified timeline and Q&amp;A from your photographed newspaper page alone.
                  </p>
                </div>
                <button
                  onClick={() => handleConfirmHeadline(selectedHeadline, detectedDate, displayLanguage, true)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition flex items-center space-x-1.5 flex-shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Use Newspaper Only</span>
                </button>
              </div>
            )}
          </div>
        )}

        {stage === 'upload' && (
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EDEAEA] dark:bg-[#282523] border border-[#D8D0C8] dark:border-[#3E3835] text-[#AF695C] text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#AF695C]" />
                <span>23 Indian Languages · Sarvam Vision · 105B Reasoning · Bulbul Voice</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#2A2A2A] dark:text-[#F9F4ED]">
                Turn Any Printed Newspaper into an Evidence-Grounded Story
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#77716D]">
                Photograph an article in any Indian script, extract verified candidate headlines, discover cross-source perspectives, and converse with spoken Q&amp;A.
              </p>
            </div>

            <UploadScreen onUpload={handleUpload} isLoading={isLoading} initialFile={retryFile} />
          </div>
        )}

        {stage === 'ocr' && (
          <ProgressStages currentStage={pipelineStage} mode="ocr" />
        )}

        {stage === 'pick_headline' && (
          <HeadlinePicker
            candidates={candidates}
            initialDate={detectedDate}
            detectedLanguage={detectedLanguage}
            ocrExcerpt={ocrExcerpt}
            onConfirm={(h, d, l) => handleConfirmHeadline(h, d, l, false)}
            isLoading={isLoading}
          />
        )}

        {stage === 'story_loading' && (
          <ProgressStages currentStage={pipelineStage} mode="story" />
        )}

        {stage === 'story' && story && sessionId && (
          <StoryView
            story={story}
            sessionId={sessionId}
            displayLanguage={displayLanguage}
            onLanguageChange={(newLang) => {
              setDisplayLanguage(newLang);
              // Trigger story re-translation or re-render
              if (selectedHeadline) {
                handleConfirmHeadline(selectedHeadline, detectedDate, newLang, false);
              }
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#D8D0C8] dark:border-[#3E3835] py-4 text-center text-xs text-[#77716D]">
        KhabarLens · Powered by Sarvam AI &amp; Tavily · Built for Sarvam Hackathon
      </footer>
    </div>
  );
}
