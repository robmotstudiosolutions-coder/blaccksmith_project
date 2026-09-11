'use client';

import React from 'react';
import { Clock, TriangleAlert } from 'lucide-react';

interface HoldCountdownProps {
  secondsRemaining: number;
  totalSeconds: number;
  disabled?: boolean;
  onConfirm: () => void;
  busy?: boolean;
}

export function HoldCountdown({ secondsRemaining, totalSeconds, disabled, onConfirm, busy }: HoldCountdownProps) {
  const fraction = totalSeconds > 0 ? secondsRemaining / totalSeconds : 0;
  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 60;
  const pct = Math.round(fraction * 100);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeLabel = mins > 0
    ? `${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`
    : `${secs} second${secs !== 1 ? 's' : ''}`;

  return (
    <div className={`hold-countdown ${isUrgent ? 'hold-countdown--urgent' : ''}`}>
      <div className="hold-countdown__bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Hold expires in ${timeLabel}`}>
        <div className="hold-countdown__bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="hold-countdown__row">
        {isUrgent
          ? <TriangleAlert className="hold-countdown__icon hold-countdown__icon--urgent" aria-hidden="true" />
          : <Clock className="hold-countdown__icon" aria-hidden="true" />}

        {/* Screen-reader friendly: announces the human-readable label */}
        <p className="countdown" aria-live="off">
          {secondsRemaining === 0
            ? 'Reservation expired'
            : `${timeLabel} remaining`}
        </p>

        <button
          className="button"
          disabled={disabled || busy || secondsRemaining === 0}
          onClick={onConfirm}
        >
          {busy ? 'Confirming…' : 'Confirm appointment'}
        </button>
      </div>
    </div>
  );
}
