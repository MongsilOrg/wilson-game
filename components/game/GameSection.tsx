'use client';

import { GameHeader } from '@/components/game/GameHeader';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameOver } from '@/components/game/GameOver';

interface GameSectionProps {
  onRankingRefresh?: () => void;
}

export function GameSection({ onRankingRefresh }: GameSectionProps) {
  // 로그인 여부와 무관하게 보드 자리를 유지한다. 로그인 안내는 보드 안에서 처리한다.
  return (
    <>
      <GameHeader />
      <GameCanvas />
      <GameOver onRankingRefresh={onRankingRefresh} />
    </>
  );
}
