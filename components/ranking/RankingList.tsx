'use client';

import { memo, useEffect, useState, useMemo, useCallback } from 'react';
import { GameRecord } from '@/types/game';
import { escapeHtml } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RankingListProps {
  refreshTrigger?: number;
  initialRecords?: GameRecord[];
}

export const RankingList = memo(function RankingList({ 
  refreshTrigger = 0,
  initialRecords = []
}: RankingListProps) {
  const [records, setRecords] = useState<GameRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchRanking = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await apiClient.get('/api/ranking');
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      } else {
        logger.warn('랭킹 조회 실패:', response.status, response.statusText);
        setError(true);
        setRecords(initialRecords);
      }
    } catch (error) {
      logger.error('Failed to fetch ranking:', error);
      setError(true);
      setRecords(initialRecords);
    } finally {
      setLoading(false);
    }
  }, [initialRecords]);

  useEffect(() => {
    // refreshTrigger가 변경되거나 초기 데이터가 없을 때만 fetch
    if (refreshTrigger > 0 || initialRecords.length === 0) {
      fetchRanking();
    }
  }, [refreshTrigger, initialRecords.length, fetchRanking]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">랭킹</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            불러오는 중
          </div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          {[...Array(5)].map((_, idx) => (
            <div
              key={idx}
              className="h-12 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">랭킹</h3>
          <button
            onClick={fetchRanking}
            className="text-xs text-primary font-semibold hover:underline transition-colors"
          >
            다시 시도
          </button>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          랭킹을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">랭킹</h3>
          <span className="text-xs font-medium text-muted-foreground bg-secondary/70 px-3 py-1 rounded-full">
            기록 없음
          </span>
        </div>
        <div className="rounded-xl border border-dashed border-border/60 bg-card px-6 py-10 text-center space-y-2">
          <div className="text-4xl mb-2">🏆</div>
          <p className="text-base font-medium text-foreground">아직 기록이 없습니다</p>
          <p className="text-sm text-muted-foreground">첫 기록을 남겨보세요.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-semibold text-foreground">랭킹</h3>
        <span className="text-xs font-medium text-muted-foreground bg-secondary/70 px-3 py-1 rounded-full">
          상위 {Math.min(records.length, 10)}명
        </span>
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-2 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 hover:bg-transparent">
                <TableHead className="w-14 text-center text-xs font-semibold text-muted-foreground">순위</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">플레이어</TableHead>
                <TableHead className="text-right text-xs font-semibold text-muted-foreground">점수</TableHead>
                <TableHead className="text-right hidden sm:table-cell text-xs font-semibold text-muted-foreground">시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record: GameRecord, index: number) => {
                const rank = index + 1;
                const isTopThree = rank <= 3;
                const rankConfig = {
                  1: { color: 'text-amber-400 dark:text-amber-300', bg: 'bg-amber-500/5 dark:bg-amber-400/10', border: 'border-amber-400/50 dark:border-amber-300/50' },
                  2: { color: 'text-slate-500 dark:text-slate-200', bg: 'bg-slate-400/5 dark:bg-slate-500/10', border: 'border-slate-300/50 dark:border-slate-500/60' },
                  3: { color: 'text-amber-500 dark:text-amber-200', bg: 'bg-amber-500/5 dark:bg-amber-400/10', border: 'border-amber-300/50 dark:border-amber-300/40' },
                } as const;
                const config = rankConfig[rank as keyof typeof rankConfig] || { color: 'text-primary', bg: '', border: '' };
                
                return (
                  <TableRow 
                    key={`${record.nickname}-${record.date}`}
                    className={`transition-colors hover:bg-secondary/40 ${isTopThree ? config.bg : ''} ${isTopThree ? config.border : ''} ${isTopThree ? 'border-l-4' : ''}`}
                  >
                    <TableCell className={`font-semibold text-center ${config.color} text-sm`}>
                      {rank}
                    </TableCell>
                    <TableCell className="font-medium max-w-[140px] sm:max-w-none text-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        {record.avatarUrl ? (
                          <img
                            src={record.avatarUrl}
                            alt={escapeHtml(record.nickname)}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                            onError={(e) => {
                              // 이미지 로드 실패 시 기본 아바타로 대체
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {escapeHtml(record.nickname).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate">{escapeHtml(record.nickname)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground tabular-nums">
                      {record.score.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs hidden sm:table-cell">
                      {formatDate(record.date)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
});

