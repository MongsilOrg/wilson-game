import { NextResponse } from 'next/server';
import { getRecords } from '@/lib/api-utils';

// Next 16(Turbopack)에서는 동적 app route의 params가 Promise로 전달됩니다.
// 에러 메시지에서 안내하듯이, await으로 언랩해서 사용해야 합니다.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ nickname: string }> }
) {
  try {
    const { nickname } = await params;
    const records = await getRecords();

    // 해당 닉네임의 모든 기록 중 가장 높은 점수 찾기
    const userRecords = records.filter((r) => r.nickname === nickname);

    if (userRecords.length === 0) {
      return NextResponse.json(null);
    }

    // 가장 높은 점수 찾기
    const bestRecord = userRecords.reduce((best, current) => {
      return current.score > best.score ? current : best;
    });

    return NextResponse.json(bestRecord);
  } catch (error) {
    return NextResponse.json(
      { error: '최고기록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

