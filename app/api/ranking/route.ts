import { NextResponse } from 'next/server';
import { dedupeAndSort, getRecords } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getRankingView } from '@/lib/ranking-view';

export async function GET() {
  try {
    const records = await getRecords();
    return NextResponse.json(await getRankingView(dedupeAndSort(records, 10)));
  } catch (error) {
    logger.error('랭킹 조회 오류:', error);
    return NextResponse.json(
      { error: '랭킹을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
