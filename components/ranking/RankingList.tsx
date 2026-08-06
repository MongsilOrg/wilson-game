'use client';

import { memo, useEffect, useState, useMemo, useCallback } from 'react';
import { GameRecord } from '@/types/game';
import { logger } from '@/lib/logger';
import { apiClient } from '@/lib/api-client';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ADMIN_DISCORD_ID = '602522819594551306';

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
  const [refreshing, setRefreshing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GameRecord | null>(null);
  const [editScore, setEditScore] = useState<string>('');
  const [editNickname, setEditNickname] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const { user } = useSession();
  
  // 관리자 확인
  const isAdmin = user?.discordId === ADMIN_DISCORD_ID;

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

  // 관리자 전용 랭킹 새로고침 (닉네임/아바타 업데이트)
  const handleAdminRefresh = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setRefreshing(true);
      const response = await apiClient.post('/api/ranking/refresh');
      
      if (response.ok) {
        const data = await response.json();
        logger.info('랭킹 새로고침 완료:', data.message);
        // 랭킹 다시 가져오기
        await fetchRanking();
      } else {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
        logger.error('랭킹 새로고침 실패:', errorData.error);
        alert(`랭킹 새로고침 실패: ${errorData.error}`);
      }
    } catch (error) {
      logger.error('랭킹 새로고침 오류:', error);
      alert('랭킹 새로고침 중 오류가 발생했습니다.');
    } finally {
      setRefreshing(false);
    }
  }, [isAdmin, fetchRanking]);

  // 행 클릭 핸들러 (관리자만)
  const handleRowClick = useCallback((record: GameRecord) => {
    if (!isAdmin || !record.discordId) return;
    setEditingRecord(record);
    setEditScore(record.score.toString());
    setEditNickname(record.nickname);
  }, [isAdmin]);

  // 변경 다이얼로그 닫기
  const handleCloseEditDialog = useCallback(() => {
    setEditingRecord(null);
    setEditScore('');
    setEditNickname('');
  }, []);

  // 기록 업데이트 (닉네임, 점수)
  const handleUpdateRecord = useCallback(async () => {
    if (!editingRecord || !editingRecord.discordId) return;
    
    const newScore = Number.parseInt(editScore, 10);
    if (Number.isNaN(newScore) || newScore < 0) {
      alert('유효하지 않은 점수입니다.');
      return;
    }

    if (!editNickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    try {
      setUpdating(true);
      const response = await apiClient.post('/api/ranking/update-score', {
        discordId: editingRecord.discordId,
        score: newScore,
        nickname: editNickname.trim(),
      });

      if (response.ok) {
        logger.info('기록 업데이트 완료');
        handleCloseEditDialog();
        // 랭킹 다시 가져오기
        await fetchRanking();
      } else {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }));
        logger.error('기록 업데이트 실패:', errorData.error);
        alert(`기록 업데이트 실패: ${errorData.error}`);
      }
    } catch (error) {
      logger.error('기록 업데이트 오류:', error);
      alert('기록 업데이트 중 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  }, [editingRecord, editScore, editNickname, handleCloseEditDialog, fetchRanking]);

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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={handleAdminRefresh}
              disabled={refreshing || loading}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title={refreshing ? '새로고침 중...' : '새로고침'}
            >
              <span className={`text-base ${refreshing ? 'animate-spin' : ''}`}>
                🔄
              </span>
            </Button>
          )}
          <span className="text-xs font-medium text-muted-foreground bg-secondary/70 px-3 py-1 rounded-full">
            상위 {Math.min(records.length, 10)}명
          </span>
        </div>
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
                    className={`transition-colors ${
                      isAdmin && record.discordId 
                        ? 'cursor-pointer hover:bg-primary/10 active:bg-primary/20' 
                        : 'hover:bg-secondary/40'
                    } ${isTopThree ? config.bg : ''} ${isTopThree ? config.border : ''} ${isTopThree ? 'border-l-4' : ''}`}
                    onClick={() => handleRowClick(record)}
                    title={isAdmin && record.discordId ? '클릭하여 닉네임/점수 변경' : ''}
                  >
                    <TableCell className={`font-semibold text-center ${config.color} text-sm`}>
                      {rank}
                    </TableCell>
                    <TableCell className="font-medium max-w-[140px] sm:max-w-none text-foreground">
                      <div className="flex items-center gap-2 min-w-0">
                        {record.avatarUrl ? (
                          <img
                            src={record.avatarUrl}
                            alt={record.nickname}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                            onError={(e) => {
                              // 이미지 로드 실패 시 기본 아바타로 대체
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-xs font-semibold text-muted-foreground">
                            {record.nickname.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate">{record.nickname}</span>
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

      {/* 기록 변경 다이얼로그 (관리자 전용) */}
      {isAdmin && editingRecord && (
        <Dialog open={!!editingRecord} onOpenChange={handleCloseEditDialog}>
          <DialogContent className="sm:max-w-lg p-6 space-y-6">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-bold">기록 수정</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {editingRecord.nickname}님의 기록을 수정합니다.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-5">
              {/* 닉네임 입력 */}
              <div className="space-y-2">
                <label htmlFor="nickname-input" className="text-sm font-semibold text-foreground block">
                  닉네임
                </label>
                <Input
                  id="nickname-input"
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  placeholder="닉네임을 입력하세요"
                  disabled={updating}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  현재: {editingRecord.nickname}
                </p>
              </div>

              {/* 점수 입력 */}
              <div className="space-y-2">
                <label htmlFor="score-input" className="text-sm font-semibold text-foreground block">
                  점수
                </label>
                <Input
                  id="score-input"
                  type="number"
                  min="0"
                  value={editScore}
                  onChange={(e) => setEditScore(e.target.value)}
                  placeholder="점수를 입력하세요"
                  disabled={updating}
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !updating && editNickname.trim() && editScore) {
                      handleUpdateRecord();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  현재: {editingRecord.score.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 버튼 영역 */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/60">
              <Button
                variant="outline"
                onClick={handleCloseEditDialog}
                disabled={updating}
                className="flex-1 min-h-[44px]"
              >
                취소
              </Button>
              <Button
                onClick={handleUpdateRecord}
                disabled={updating || !editNickname.trim() || !editScore}
                className="flex-1 min-h-[44px]"
              >
                {updating ? '변경 중...' : '변경하기'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

