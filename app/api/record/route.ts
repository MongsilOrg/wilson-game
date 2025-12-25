import { NextResponse } from 'next/server';
import { getRecords, saveRecords, upsertRecord } from '@/lib/api-utils';

export async function POST(request: Request) {
  try {
    const { nickname, score } = await request.json();
    
    if (!nickname || score === undefined) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // KST 시간 기준으로 저장 (서버 시간대를 KST로 설정하거나 UTC+9 계산)
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    const records = await getRecords();
    const { records: nextRecords, updated } = upsertRecord(
      records,
      nickname,
      score,
      kstTime.toISOString()
    );

    if (!updated) {
      return NextResponse.json({ success: true, message: '기존 기록이 더 높거나 같습니다.' });
    }

    // 모든 기록 저장 (상위 10개 제한 없음)
    await saveRecords(nextRecords);

    return NextResponse.json({ success: true, message: '기록이 저장되었습니다.' });
  } catch (error) {
    return NextResponse.json(
      { error: '기록 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}

