'use client';

import { useState, useEffect } from 'react';
import { useAudio } from '@/hooks/useAudio';
import { useGameContext } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX } from 'lucide-react';

export function AudioControl() {
  const { gameState } = useGameContext();
  const { isPlaying, volume, mounted, setVolume, toggle, play, pause } = useAudio('/background-music.mp3', true, false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 게임 상태에 따라 자동 재생/정지
  useEffect(() => {
    if (gameState === 'playing') {
      play();
    } else {
      pause();
    }
  }, [gameState, play, pause]);

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  // 클라이언트에서만 실제 볼륨 표시, 서버에서는 기본값 사용
  // 초기 스크립트가 이미 올바른 스타일을 적용했으므로 깜빡임 없음
  const displayVolume = isClient && mounted ? volume : 0.1;

  return (
    <div className="flex items-center gap-2 sm:gap-3" suppressHydrationWarning>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className="h-9 w-9 touch-manipulation shrink-0 hover:bg-primary/10 transition-colors"
        aria-label={isPlaying ? '음악 끄기' : '음악 켜기'}
      >
        {isPlaying ? (
          <Volume2 className={`h-4 w-4 text-primary transition-transform ${isPlaying ? 'scale-110' : ''}`} />
        ) : (
          <VolumeX className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
      <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[120px]">
        <Slider
          value={[displayVolume]}
          onValueChange={handleVolumeChange}
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
          suppressHydrationWarning
        />
        <span className="text-xs font-semibold text-foreground min-w-[2.5rem] text-right tabular-nums" suppressHydrationWarning>
          {Math.round(displayVolume * 100)}%
        </span>
      </div>
    </div>
  );
}

