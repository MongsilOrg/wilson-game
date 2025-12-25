'use client';

import { useState, useCallback, useEffect } from 'react';
import { GameSection } from '@/components/game/GameSection';
import { GameIntro } from '@/components/game/GameIntro';
import { RankingSection } from '@/components/ranking/RankingSection';
import { GameRecord } from '@/types/game';

interface ClientGameWrapperProps {
  initialRankings: GameRecord[];
}

export function ClientGameWrapper({ initialRankings }: ClientGameWrapperProps) {
  const [rankingRefreshTrigger, setRankingRefreshTrigger] = useState(0);
  const [isMobileLike, setIsMobileLike] = useState(false);

  const handleRankingRefresh = useCallback(() => {
    setRankingRefreshTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === 'undefined') return;
      const isNarrow = window.innerWidth < 768;
      const isTallPortrait = window.innerHeight / Math.max(window.innerWidth, 1) > 1.3;
      setIsMobileLike(isNarrow || isTallPortrait);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  if (isMobileLike) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 px-5 py-7 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-amber-200 text-amber-800 text-lg font-bold">
              PC
            </div>
            <div>
              <h2 className="text-lg font-semibold">데스크톱에서 이용해주세요</h2>
            </div>
          </div>
          <div className="space-y-2 text-sm text-amber-900/90">
            <p>가로 화면 또는 데스크톱 브라우저에서 접속하면 바로 플레이할 수 있습니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 lg:p-7 space-y-4">
        <GameSection onRankingRefresh={handleRankingRefresh} />
      </section>

      <div className="grid gap-4 lg:gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
          <GameIntro refreshTrigger={rankingRefreshTrigger} />
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 space-y-4">
          <RankingSection 
            initialRecords={initialRankings} 
            refreshTrigger={rankingRefreshTrigger}
          />
        </section>
      </div>
    </div>
  );
}

