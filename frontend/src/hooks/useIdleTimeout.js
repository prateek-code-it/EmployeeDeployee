import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 60 * 30 * 1000;   // 30 minutes total idle time
const WARNING_BEFORE_MS = 10 * 1000;       // show warning 60 seconds before logout

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

export function useIdleTimeout(onTimeout) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warningTimerRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setSecondsLeft(Math.floor(WARNING_BEFORE_MS / 1000));
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    warningTimerRef.current = setTimeout(startWarningCountdown, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
    idleTimerRef.current = setTimeout(() => {
      clearAllTimers();
      onTimeout();
    }, IDLE_TIMEOUT_MS);
  }, [clearAllTimers, startWarningCountdown, onTimeout]);

  useEffect(() => {
    resetTimers();

    const handleActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity));

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stayLoggedIn() {
    resetTimers();
  }

  return { showWarning, secondsLeft, stayLoggedIn };
}
