import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  error: {
    code?: string;
    message: string;
    retryable?: boolean;
  } | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-[#EDEAEA] border border-[#AF695C]/50 text-[#2A2A2A] flex items-start justify-between shadow-sm animate-in fade-in duration-200 font-sans">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#AF695C]" />
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm text-[#2A2A2A]">Action Needed</span>
            {error.code && (
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-[#AF695C]/15 text-[#AF695C] border border-[#AF695C]/30">
                {error.code}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm mt-1 text-[#77716D]">
            {error.message}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
        {error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#AF695C] text-white hover:bg-[#99594D] transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-[#AF695C] hover:underline px-2 py-1"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
