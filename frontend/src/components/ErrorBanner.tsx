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
    <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-start justify-between shadow-sm animate-in fade-in duration-200">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm">Action Needed</span>
            {error.code && (
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                {error.code}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm mt-1 text-rose-800 dark:text-rose-300">
            {error.message}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
        {error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-1"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
