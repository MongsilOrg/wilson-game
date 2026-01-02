import { NextResponse } from 'next/server';
import { getRecords } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// Next 16(Turbopack)에서는 동적 app route의 params가 Promise로 전달됩니다.
// 에러 메시지에서 안내하듯이, await으로 언랩해서 사용해야 합니다.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ nickname: string }> }
) {
  try {
    const { nickname } = await params;
    const records = await getRecords();

    // discordId로 검색 (nickname 파라미터가 실제로는 discordId로 사용됨)
    // 또는 닉네임으로 검색 (하위 호환성)
    const userRecords = records.filter(
      (r) => r.discordId === nickname || r.nickname === nickname
    );

    if (userRecords.length === 0) {
      return NextResponse.json(null);
    }

    // 가장 높은 점수 찾기
    const bestRecord = userRecords.reduce((best, current) => {
      return current.score > best.score ? current : best;
    });

    return NextResponse.json(bestRecord);
  } catch (error) {
    logger.error('최고기록 조회 오류:', error);
    return NextResponse.json(
      { error: '최고기록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

