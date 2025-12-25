'use client';

/* eslint-disable react-hooks/set-state-in-effect */
import { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { useGameContext } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trophy } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AudioControl } from '@/components/game/AudioControl';

interface GameIntroProps {
  refreshTrigger?: number;
}

export const GameIntro = memo(function GameIntro({ refreshTrigger = 0 }: GameIntroProps) {
  const { gameState, startGame, restartGame } = useGameContext();
  // 서버와 클라이언트가 동일하게 렌더링되도록 초기값은 빈 문자열
  // 실제 닉네임은 useEffect에서 설정하여 Hydration 오류 방지
  const [nickname, setNickname] = useState('');
  const [bestRecord, setBestRecord] = useState<{ score: number; date: string } | null>(null);
  const [error, setError] = useState(false);
  const [bestRecordError, setBestRecordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const fetchBestRecord = useCallback(async (nick: string) => {
    try {
      setBestRecordError(false);
      const response = await fetch(`/api/best/${encodeURIComponent(nick)}`);
      if (response.ok) {
        const data = await response.json();
        setBestRecord(data);
      } else {
        setBestRecord(null);
        if (response.status >= 500) {
          setBestRecordError(true);
        }
      }
    } catch (error) {
      setBestRecord(null);
      setBestRecordError(true);
    }
  }, []);

  useEffect(() => {
    // 저장된 닉네임 불러오기
    if (typeof window !== 'undefined') {
      const dataNickname = document.documentElement.getAttribute('data-nickname');
      const savedNickname = dataNickname || localStorage.getItem('playerNickname') || '';
      if (savedNickname) {
        setNickname(savedNickname);
        fetchBestRecord(savedNickname);
      }
    }
  }, [fetchBestRecord]);

  useEffect(() => {
    if (nickname) {
      fetchBestRecord(nickname);
    }
  }, [nickname, refreshTrigger, fetchBestRecord]);

  const handleStart = useCallback(() => {
    console.log('[GameIntro] handleStart called, nickname:', nickname);
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      console.log('[GameIntro] Nickname is empty, showing error');
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }

    // 게임 중이면 확인 창
    if (gameState !== 'waiting') {
      setConfirmRestart(true);
      return;
    }

    console.log('[GameIntro] Starting game with nickname:', trimmedNickname);
    localStorage.setItem('playerNickname', trimmedNickname);
    // data attribute도 업데이트
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-nickname', trimmedNickname);
    }
    startGame(trimmedNickname);
  }, [nickname, startGame, gameState]);

  const handleConfirmRestart = useCallback(() => {
    const trimmedNickname = nickname.trim();
    setConfirmRestart(false);
    if (!trimmedNickname) {
      setError(true);
      setTimeout(() => setError(false), 2000);
      return;
    }
    // useGame 훅에서 저장한 playerNickname을 사용해 다시 시작
    restartGame();
  }, [nickname, restartGame]);

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
          <h3 className="text-lg font-semibold text-foreground">닉네임</h3>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AudioControl />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            value={nickname}
            onChange={(e) => {
              const newNickname = e.target.value;
              setNickname(newNickname);
              localStorage.setItem('playerNickname', newNickname);
              // data attribute도 업데이트
              if (typeof window !== 'undefined') {
                if (newNickname) {
                  document.documentElement.setAttribute('data-nickname', newNickname);
                } else {
                  document.documentElement.removeAttribute('data-nickname');
                }
              }
            }}
            placeholder="닉네임을 입력하세요"
            maxLength={10}
            className={`flex-1 ${error ? 'border-destructive bg-destructive/10 animate-shake' : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleStart();
              }
            }}
          />
          <Button
            onClick={(e) => {
              console.log('[GameIntro] Button clicked', e);
              handleStart();
            }}
            className="min-h-[44px] sm:min-w-[130px] px-5 font-semibold"
            variant={gameState === 'waiting' ? 'default' : 'secondary'}
          >
            {gameState === 'waiting' ? '게임 시작' : '다시 시작'}
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive animate-fade-in">
            <div className="h-1 w-1 rounded-full bg-destructive" />
            닉네임을 입력해주세요
          </div>
        )}
        {gameState !== 'waiting' && (
          <div className="flex items-center gap-2 text-xs text-success font-semibold">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            게임 진행 중
          </div>
        )}
      </div>

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

      <Dialog open={confirmRestart} onOpenChange={setConfirmRestart}>
        <DialogContent className="sm:max-w-md space-y-4 pt-4 pb-3 px-8">
          <DialogHeader>
            <DialogTitle>게임을 다시 시작할까요?</DialogTitle>
            <DialogDescription>현재 진행 중인 게임이 종료되고 새로 시작됩니다.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmRestart(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleConfirmRestart}>
              다시 시작
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

