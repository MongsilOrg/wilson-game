'use client';

import { useCallback } from 'react';
import { useGameContext } from '@/contexts/GameContext';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { DiscordLoginButton } from '@/components/auth/DiscordLoginButton';

const RULES = [
  { value: '10', label: '드래그한 칸의 합이 10이면 지워집니다' },
  { value: '+1', label: '지운 윌슨 하나당 1점' },
  { value: '2:00', label: '2분 안에 최대한 많이' },
];

/**
 * 게임 시작 전 보드 자리에 들어가는 안내.
 * 이 자리가 화면에서 가장 큰 영역이라 규칙과 시작 버튼을 함께 둔다.
 */
export function BoardIntro() {
  const { startGame } = useGameContext();
  const { user, isAuthenticated, isLoading, isVerified } = useSession();

  const handleStart = useCallback(() => {
    if (user?.name) {
      startGame(user.name);
    }
  }, [startGame, user?.name]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6 py-8 text-center">
      <div className="space-y-4">
        <div className="flex items-end justify-center gap-1.5" aria-hidden="true">
          {[3, 5, 2].map((n, i) => (
            <img
              key={n}
              src={`/wilson/number_${n}.png`}
              alt=""
              className="h-14 w-14 sm:h-16 sm:w-16"
              style={{ transform: `translateY(${i === 1 ? '-0.5rem' : '0'})` }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">3 + 5 + 2 = 10</p>
      </div>

      <dl className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
        {RULES.map((rule) => (
          <div
            key={rule.value}
            className="rounded-xl border border-border/60 bg-card/70 px-4 py-3 text-left"
          >
            <dt className="text-xl font-bold tabular-nums text-foreground">{rule.value}</dt>
            <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{rule.label}</dd>
          </div>
        ))}
      </dl>

      <div className="w-full max-w-xs">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">불러오는 중</p>
        ) : !isAuthenticated ? (
          <div className="space-y-2">
            <DiscordLoginButton />
            <p className="text-xs text-muted-foreground">디스코드로 로그인하면 바로 시작할 수 있어요</p>
          </div>
        ) : !isVerified ? (
          <p className="text-sm text-muted-foreground">학적 인증을 마치면 게임을 시작할 수 있어요</p>
        ) : (
          <Button onClick={handleStart} size="lg" className="w-full min-h-[48px] text-base font-semibold">
            게임 시작
          </Button>
        )}
      </div>
    </div>
  );
}
