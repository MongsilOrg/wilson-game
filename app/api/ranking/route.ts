import { NextResponse } from 'next/server';
import { dedupeAndSort, getRecords } from '@/lib/api-utils';

export async function GET() {
  try {
    const records = await getRecords();

    // 닉네임 중복 제거 및 정렬 후 상위 10개만 반환
    return NextResponse.json(dedupeAndSort(records, 10));
  } catch (error) {
    return NextResponse.json(
      { error: '랭킹을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

