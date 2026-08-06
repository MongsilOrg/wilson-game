import { dedupeAndSort, getRecords } from '@/lib/api-utils';
import { getRankingView } from '@/lib/ranking-view';
import { ClientGameWrapper } from '@/components/ClientGameWrapper';
import { SiteHeader } from '@/components/SiteHeader';
import { logger } from '@/lib/logger';

// 랭킹 데이터는 실시간으로 업데이트되므로 동적 렌더링 사용
export const dynamic = 'force-dynamic';

async function getTopRankings() {
  try {
    const records = await getRecords();
    return await getRankingView(dedupeAndSort(records, 10));
  } catch (error) {
    // 랭킹을 못 읽어도 게임은 되어야 하므로 빈 목록으로 렌더한다.
    logger.error('초기 랭킹 조회 실패:', error);
    return [];
  }
}

export default async function Home() {
  const topRankings = await getTopRankings();

  return (
    <div className="min-h-screen px-4 py-6 sm:py-8 lg:py-10">
      <div className="container max-w-6xl mx-auto space-y-6 lg:space-y-8">
        <SiteHeader />

        <ClientGameWrapper initialRankings={topRankings} />
      </div>
    </div>
  );
}

