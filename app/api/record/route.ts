import { NextResponse } from 'next/server';
import { getRecords, saveRecords, upsertRecord } from '@/lib/api-utils';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = session.user as { discordId: string; name: string; image: string | null; isMember: boolean };
    
    if (!user.isMember) {
      return NextResponse.json(
        { error: '서버 멤버만 기록을 저장할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { score } = await request.json();
    
    if (score === undefined) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // KST 시간 기준으로 저장 (서버 시간대를 KST로 설정하거나 UTC+9 계산)
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    
    const records = await getRecords();
    
    // discordId로 기존 기록 찾기
    const existingRecordIndex = records.findIndex(
      (r) => r.discordId === user.discordId
    );
    
    let updated = false;
    let nextRecords = [...records];
    
    if (existingRecordIndex !== -1) {
      const existing = records[existingRecordIndex];
      if (score > existing.score) {
        nextRecords[existingRecordIndex] = {
          nickname: user.name,
          score: Number.parseInt(score.toString(), 10),
          date: kstTime.toISOString(),
          avatarUrl: user.image || undefined,
          discordId: user.discordId,
        };
        updated = true;
      }
    } else {
      // 새 기록 추가
      nextRecords.push({
        nickname: user.name,
        score: Number.parseInt(score.toString(), 10),
        date: kstTime.toISOString(),
        avatarUrl: user.image || undefined,
        discordId: user.discordId,
      });
      updated = true;
    }

    if (!updated) {
      return NextResponse.json({ success: true, message: '기존 기록이 더 높거나 같습니다.' });
    }

    // 모든 기록 저장 (상위 10개 제한 없음)
    await saveRecords(nextRecords);

    return NextResponse.json({ success: true, message: '기록이 저장되었습니다.' });
  } catch (error) {
    logger.error('기록 저장 오류:', error);
    return NextResponse.json(
      { error: '기록 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}

