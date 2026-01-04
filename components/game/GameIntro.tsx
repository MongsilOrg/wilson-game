'use client';

import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { useGameContext } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trophy, RotateCcw, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AudioControl } from '@/components/game/AudioControl';
import { useSession } from '@/hooks/useSession';
import { signOut } from 'next-auth/react';
import { GameRecord } from '@/types/game';
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';

interface GameIntroProps {
  refreshTrigger?: number;
}

export const GameIntro = memo(function GameIntro({ refreshTrigger = 0 }: GameIntroProps) {
  const { gameState, startGame, restartGame } = useGameContext();
  const { user, isAuthenticated, isLoading, isVerified } = useSession();
  const [bestRecord, setBestRecord] = useState<GameRecord | null>(null);
  const [bestRecordError, setBestRecordError] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const fetchBestRecord = useCallback(async (discordId: string) => {
    try {
      setBestRecordError(false);
      const response = await apiClient.get(`/api/best/${encodeURIComponent(discordId)}`);
      if (response.ok) {
        const data = await response.json();
        setBestRecord(data);
      } else {
        setBestRecord(null);
        if (response.status >= 500) {
          setBestRecordError(true);
          logger.warn('최고기록 조회 실패:', response.status, response.statusText);
        }
      }
    } catch (error) {
      setBestRecord(null);
      setBestRecordError(true);
      logger.error('최고기록 조회 오류:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.discordId) {
      fetchBestRecord(user.discordId);
    }
  }, [user?.discordId, refreshTrigger, fetchBestRecord]);

  const handleStart = useCallback(() => {
    if (!user?.name) {
      return;
    }

    // 게임 종료 상태면 바로 새 게임 시작
    if (gameState === 'gameOver') {
      restartGame();
      return;
    }

    // 게임 중이면 확인 창
    if (gameState !== 'waiting') {
      setConfirmRestart(true);
      return;
    }

    startGame(user.name);
  }, [user?.name, startGame, restartGame, gameState]);

  const handleConfirmRestart = useCallback(() => {
    setConfirmRestart(false);
    restartGame();
  }, [restartGame]);

  const handleLogout = useCallback(async () => {
    await signOut({ callbackUrl: '/' });
  }, []);

  const formatDate = useMemo(() => (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }, []);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            게임 시작
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AudioControl />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">로딩 중...</div>
        </div>
      ) : !isAuthenticated || !isVerified ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground text-center">
            게임을 시작하려면 로그인 및 학적 인증이 필요합니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/50">
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name || '프로필'}
                  className="w-10 h-10 rounded-full border-2 border-border/40"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name || '사용자'}
                </p>
                <p className="text-xs text-muted-foreground">학적 인증 완료</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground shrink-0"
                title="로그아웃"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleStart}
              className="flex-1 min-h-[44px] px-5 font-semibold"
              variant={gameState === 'waiting' || gameState === 'gameOver' ? 'default' : 'secondary'}
              size="lg"
            >
              {gameState === 'waiting' ? (
                '게임 시작'
              ) : gameState === 'gameOver' ? (
                '새 게임 시작'
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  다시 시작
                </>
              )}
            </Button>
          </div>

          {gameState === 'playing' && (
            <div className="flex items-center gap-2 text-xs text-success font-semibold">
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              게임 진행 중
            </div>
          )}

          {gameState === 'gameOver' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              게임 종료
            </div>
          )}

          {bestRecord && (
            <Card className="border border-border/70 bg-card shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-foreground" />
                  내 최고 기록
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted-foreground">점수</span>
                  <span className="text-2xl font-bold text-foreground tabular-nums">{bestRecord.score}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-xs text-muted-foreground">기록 시간</span>
                  <span className="text-sm font-medium text-foreground">{formatDate(bestRecord.date)}</span>
                </div>
              </CardContent>
            </Card>
          )}
          {bestRecordError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
              최고 기록을 불러오는데 실패했습니다
            </div>
          )}
        </div>
      )}

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent className="sm:max-w-md space-y-5 px-6 sm:px-8 pt-8 pb-6">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <RotateCcw className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground">
              게임을 다시 시작할까요?
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              현재 진행 중인 게임이 종료되고<br />
              새로운 게임이 시작됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmRestart(false)}
              className="flex-1 min-h-[48px] text-base font-semibold border-border/60 hover:bg-secondary/50 transition-all duration-200"
              size="lg"
            >
              취소
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmRestart}
              className="flex-1 min-h-[48px] text-base font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              다시 시작
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
