import { useState, useEffect, useRef, useCallback } from 'react';
import { resendCountdownLabel } from './verifyHelpers';

/**
 * Shared resend countdown logic for verification screens.
 * Manages timer interval cleanup, state transitions, and label formatting.
 */
export function useResendCountdown(initialSeconds: number = 0) {
  const [countdown, setCountdown] = useState<number>(() => Math.max(0, Math.floor(initialSeconds)));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const s = Math.max(0, Math.floor(seconds));
    setCountdown(s);
    if (s <= 0) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (initialSeconds > 0) {
      startCountdown(initialSeconds);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initialSeconds, startCountdown]);

  return {
    countdown,
    startCountdown,
    isCounting: countdown > 0,
    label: resendCountdownLabel(countdown),
  };
}
