'use client';

import { RankingList } from './RankingList';
import { GameRecord } from '@/types/game';

interface RankingSectionProps {
  initialRecords: GameRecord[];
  refreshTrigger?: number;
}

export function RankingSection({ initialRecords, refreshTrigger = 0 }: RankingSectionProps) {
  return <RankingList initialRecords={initialRecords} refreshTrigger={refreshTrigger} />;
}

