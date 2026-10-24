import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function usePolling(
  callback: () => Promise<boolean | void>, // return true to stop polling
  options: UsePollingOptions = {}
) {
  const { intervalMs = 1500, enabled = true } = options;
  const savedCallback = useRef(callback);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    let isSubscribed = true;
    let requestInFlight = false;

    async function poll() {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const shouldStop = await savedCallback.current();
        if (shouldStop && isSubscribed) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      } finally {
        requestInFlight = false;
      }
    }

    // Call immediately once, then interval
    poll();
    timerRef.current = window.setInterval(poll, intervalMs);

    return () => {
      isSubscribed = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, intervalMs]);
}
