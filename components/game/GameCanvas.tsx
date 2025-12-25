'use client';

import { memo } from 'react';
import { useGameContext } from '@/contexts/GameContext';

export const GameCanvas = memo(function GameCanvas() {
  const { canvasRef, gameState } = useGameContext();

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[960px]">
        <div className="relative w-full aspect-[17/10]">
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full rounded-2xl border-2 border-border/60 bg-gradient-to-br from-card via-card to-secondary/20 shadow-lg cursor-crosshair touch-none transition-all duration-500 ${
              gameState === 'waiting' 
                ? 'opacity-0 pointer-events-none' 
                : 'opacity-100 animate-fade-in'
            }`}
          />
          {gameState === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 border-2 border-dashed border-border/50 min-h-[300px]">
              <div className="text-center space-y-3 px-4">
                <div className="text-4xl sm:text-5xl">🎮</div>
                <p className="text-base sm:text-lg font-semibold text-foreground">게임을 시작해주세요</p>
                <p className="text-xs sm:text-sm text-muted-foreground">닉네임을 입력하고 시작 버튼을 눌러주세요</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

