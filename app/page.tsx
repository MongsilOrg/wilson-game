import { dedupeAndSort, getRecords } from '@/lib/api-utils';
import { ClientGameWrapper } from '@/components/ClientGameWrapper';

// 랭킹 데이터는 실시간으로 업데이트되므로 동적 렌더링 사용
export const dynamic = 'force-dynamic';

export default async function Home() {
  // 서버에서 랭킹 데이터 가져오기 (SSR)
  const records = await getRecords();

  // 닉네임 중복 제거 및 정렬
  const topRankings = dedupeAndSort(records, 10);

  return (
    <div className="min-h-screen px-4 py-6 sm:py-8 lg:py-10">
      <div className="container max-w-6xl mx-auto space-y-6 lg:space-y-8">
        <header className="flex flex-col gap-3 sm:gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Wilson Game</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">윌슨게임</h1>
            </div>
          </div>
        </header>

        <ClientGameWrapper initialRankings={topRankings} />
      </div>
    </div>
  );
}

