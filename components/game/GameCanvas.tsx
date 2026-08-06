'use client';

import { memo } from 'react';
import { useGameContext } from '@/contexts/GameContext';
import { BoardIntro } from '@/components/game/BoardIntro';

export const GameCanvas = memo(function GameCanvas() {
  const { canvasRef, gameState } = useGameContext();
  const isWaiting = gameState === 'waiting';

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[960px]">
        <div className="relative w-full aspect-[17/10]">
          {/* 대기 중에도 캔버스를 붙여둬야 시작 시점에 바로 초기화된다. */}
          <canvas
            ref={canvasRef}
            aria-label="게임 보드"
            className={`absolute inset-0 w-full h-full rounded-2xl border-2 border-border/60 bg-card shadow-lg cursor-crosshair touch-none transition-opacity duration-500 ${
              isWaiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          />
          {isWaiting && (
            <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-border/60 bg-secondary/30">
              <BoardIntro />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
