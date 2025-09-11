// タイマーコンポーネント

import { useEffect, useState } from 'react';

interface TimerProps {
  turnSeconds: number | null;
  isActive: boolean;
  onTimeout?: () => void;
  className?: string;
}

export function Timer({ turnSeconds, isActive, onTimeout, className = '' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(turnSeconds || 0);
  const [deadline, setDeadline] = useState<number>(0);

  useEffect(() => {
    if (!isActive || turnSeconds === null) {
      setTimeLeft(turnSeconds || 0);
      return;
    }

    // タイマー開始
    const newDeadline = performance.now() + turnSeconds * 1000;
    setDeadline(newDeadline);
    setTimeLeft(turnSeconds);

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((newDeadline - performance.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onTimeout) {
          onTimeout();
        }
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isActive, turnSeconds, onTimeout]);

  if (turnSeconds === null) {
    return (
      <div className={`timer-display ${className}`}>
        TIME <span id="timeLeft">∞</span>
      </div>
    );
  }

  const isWarning = timeLeft <= 5;

  return (
    <div className={`timer-display ${isWarning ? 'warning' : ''} ${className}`}>
      TIME <span id="timeLeft">{timeLeft}</span>
    </div>
  );
}
