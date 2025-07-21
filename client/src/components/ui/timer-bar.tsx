import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TimerBarProps {
  deadline: string | null;
  className?: string;
  minimal?: boolean;
}

export function TimerBar({ deadline, className, minimal = false }: TimerBarProps) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [percentage, setPercentage] = useState(100);

  useEffect(() => {
    if (!deadline) return;

    const deadlineTime = new Date(deadline).getTime();
    const totalTime = 15000; // 15 seconds

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, deadlineTime - now);
      const percent = (remaining / totalTime) * 100;

      setTimeRemaining(Math.ceil(remaining / 1000));
      setPercentage(Math.max(0, percent));

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [deadline]);

  if (minimal) {
    return (
      <div 
        className={cn("h-full bg-primary transition-all duration-100", className)}
        style={{ width: `${percentage}%` }}
      />
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600">Time Remaining</span>
        <span className="text-sm font-bold text-slate-900">{timeRemaining}s</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3">
        <div 
          className="bg-gradient-to-r from-green-500 to-yellow-500 h-3 rounded-full transition-all duration-100" 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
