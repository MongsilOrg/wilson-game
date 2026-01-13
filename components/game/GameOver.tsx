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

  // 게임 종료 시 랭킹 새로고침 (기록 저장 완료 대기)
  // endGame에서 기록 저장이 완료된 후에 랭킹을 새로고침하도록 함
  // 기록 저장은 비동기이므로 충분한 시간 대기 (2초)
  useEffect(() => {
    if (gameState === 'gameOver' && onRankingRefresh) {
      const timer = setTimeout(() => {
        onRankingRefresh();
      }, 2000);
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

  const handleClose = () => {
    setOpen(false);
  };

  const handleRestart = () => {
    setOpen(false);
    restartGame();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg mx-4 rounded-3xl border border-border/60 shadow-2xl px-6 sm:px-8 pt-8 pb-6 space-y-6 bg-gradient-to-br from-card via-card to-secondary/20">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 flex items-center justify-center animate-bounce-in shadow-lg">
            <Trophy className="h-10 w-10 text-primary" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-foreground">
            게임 종료!
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            수고하셨습니다 🎉
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="text-center space-y-3 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              최종 점수
            </p>
            <div className="text-6xl sm:text-7xl font-bold tabular-nums animate-pulse-glow">
              <span className="bg-gradient-to-br from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                {score.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 min-h-[48px] text-base font-semibold border-border/60 hover:bg-secondary/50 transition-all duration-200"
              size="lg"
            >
              확인
            </Button>
            <Button 
              onClick={handleRestart} 
              className="flex-1 min-h-[48px] text-base font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
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

