'use client';

import { GameHeader } from '@/components/game/GameHeader';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameOver } from '@/components/game/GameOver';
import { useSession } from '@/hooks/useSession';
import { DiscordLoginButton } from '@/components/auth/DiscordLoginButton';

interface GameSectionProps {
  onRankingRefresh?: () => void;
}

export function GameSection({ onRankingRefresh }: GameSectionProps) {
  const { isAuthenticated, isLoading } = useSession();

  // 로딩 중이면 아무것도 표시하지 않음
  if (isLoading) {
    return null;
  }

  // 로그인이 안 되어 있으면 로그인 UI 표시
  // 로그인 시점에서 이미 학적 인증 검증이 완료되므로, 로그인 성공 시 바로 게임 접근 가능
  if (!isAuthenticated) {
    return (
      <div className="space-y-3">
        <DiscordLoginButton />
        <p className="text-xs text-muted-foreground text-center">
          디스코드로 로그인하여 게임을 시작하세요
        </p>
      </div>
    );
  }

  // 로그인 성공 시 바로 게임 컴포넌트 표시 (signIn 콜백에서 이미 검증 완료)
  return (
    <>
      <GameHeader />
      <div className="relative rounded-2xl border border-border/60 bg-card p-3 sm:p-4">
        <GameCanvas />
      </div>
      <GameOver onRankingRefresh={onRankingRefresh} />
    </>
  );
}

