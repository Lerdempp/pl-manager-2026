import React, { useEffect, useRef } from 'react';

interface NotificationTimerProps {
  duration: number;
  onComplete: () => void;
}

export const NotificationTimer: React.FC<NotificationTimerProps> = ({ duration, onComplete }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onCompleteRef.current();
    }, duration);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration]);
  
  return null;
};

