'use client';

import { GameHeader } from '@/components/game/GameHeader';
import { GameCanvas } from '@/components/game/GameCanvas';
import { GameOver } from '@/components/game/GameOver';

interface GameSectionProps {
  onRankingRefresh?: () => void;
}

export function GameSection({ onRankingRefresh }: GameSectionProps) {
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

