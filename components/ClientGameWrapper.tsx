'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import { GameSection } from '@/components/game/GameSection';
import { GameIntro } from '@/components/game/GameIntro';
import { RankingSection } from '@/components/ranking/RankingSection';
import { GameRecord } from '@/types/game';
import { Monitor } from 'lucide-react';

interface ClientGameWrapperProps {
  initialRankings: GameRecord[];
}

const MOBILE_QUERY = '(max-width: 767px), (max-aspect-ratio: 10/13)';

function subscribeViewport(onChange: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function useIsMobileLike(): boolean {
  return useSyncExternalStore(
    subscribeViewport,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

export function ClientGameWrapper({ initialRankings }: ClientGameWrapperProps) {
  const [rankingRefreshTrigger, setRankingRefreshTrigger] = useState(0);
  const isMobileLike = useIsMobileLike();

  const handleRankingRefresh = useCallback(() => {
    setRankingRefreshTrigger(prev => prev + 1);
  }, []);

  // 드래그로 하는 게임이라 좁은 화면에서는 플레이만 막고, 랭킹은 그대로 보여준다.
  if (isMobileLike) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card px-4 py-4">
          <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">플레이는 데스크톱에서 할 수 있어요</p>
            <p className="text-sm text-muted-foreground">
              드래그로 조작하는 게임이라 가로 화면이나 PC 브라우저가 필요합니다. 랭킹은 여기서 바로 확인할 수 있어요.
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <RankingSection initialRecords={initialRankings} refreshTrigger={rankingRefreshTrigger} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 lg:p-7 space-y-4">
        <GameSection onRankingRefresh={handleRankingRefresh} />
      </section>

      <div className="grid items-start gap-4 lg:gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
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
