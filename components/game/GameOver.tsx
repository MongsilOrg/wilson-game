'use client';

import { memo, useEffect, useState } from 'react';
import { useGameContext } from '@/contexts/GameContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, RotateCcw } from 'lucide-react';

interface GameOverProps {
  onRankingRefresh?: () => void;
}

export const GameOver = memo(function GameOver({ onRankingRefresh }: GameOverProps) {
  const { gameState, score, restartGame } = useGameContext();
  const [open, setOpen] = useState(false);

  // 게임 종료 시 랭킹 새로고침
  useEffect(() => {
    if (gameState === 'gameOver' && onRankingRefresh) {
      const timer = setTimeout(() => {
        onRankingRefresh();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameState, onRankingRefresh]);

  // 게임 종료 시 팝업 열기, 다른 상태에서는 닫기
  useEffect(() => {
    setOpen(gameState === 'gameOver');
  }, [gameState]);

  if (gameState !== 'gameOver') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg mx-4 rounded-3xl border-2 border-border/50 shadow-xl px-8 pt-6 pb-5 space-y-6">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-foreground">
            게임 종료!
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            수고하셨습니다
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              최종 점수
            </p>
            <div className="text-5xl sm:text-6xl font-bold text-primary tabular-nums bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent">
              {score}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full min-h-[52px] text-base font-semibold"
              size="lg"
            >
              확인
            </Button>
            <Button 
              onClick={restartGame} 
              className="w-full min-h-[52px] text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              다시 시작
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

