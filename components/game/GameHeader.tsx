'use client';

import { memo, useMemo } from 'react';
import { useGameContext } from '@/contexts/GameContext';
import { Card, CardContent } from '@/components/ui/card';
import { formatTime } from '@/lib/utils';
import { Trophy, Clock } from 'lucide-react';

export const GameHeader = memo(function GameHeader() {
  const { score, timeLeft, gameState } = useGameContext();
  
  const formattedTime = useMemo(() => formatTime(timeLeft), [timeLeft]);
  const isWarning = useMemo(() => timeLeft <= 30, [timeLeft]);
  const isCritical = useMemo(() => timeLeft <= 10, [timeLeft]);

  if (gameState === 'waiting') {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-fade-in">
      <Card className="border border-border/70 bg-card shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-foreground" />
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">점수</div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">{score}</div>
        </CardContent>
      </Card>
      <Card className="border border-border/70 bg-card shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-foreground" />
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">남은 시간</div>
          </div>
          <div
            className={`text-3xl sm:text-4xl font-bold tabular-nums transition-colors duration-300 ${
              isCritical
                ? 'text-destructive'
                : isWarning
                ? 'text-amber-600'
                : 'text-foreground'
            }`}
          >
            {formattedTime}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

