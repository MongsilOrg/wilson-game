import { NextResponse } from 'next/server';
import { getRecords, saveRecords } from '@/lib/api-utils';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';

const ADMIN_DISCORD_ID = '602522819594551306';

/**
 * 관리자 확인
 */
function isAdmin(discordId: string | undefined): boolean {
  return discordId === ADMIN_DISCORD_ID;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = session.user as { discordId: string };
    
    // 관리자 확인
    if (!isAdmin(user.discordId)) {
      return NextResponse.json(
        { error: '관리자만 접근할 수 있습니다.' },
        { status: 403 }
      );
    }

    const { discordId, score, nickname } = await request.json();
    
    if (!discordId) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 모든 기록 가져오기
    const records = await getRecords();
    
    // discordId로 기록 찾기
    const recordIndex = records.findIndex(r => r.discordId === discordId);
    
    if (recordIndex === -1) {
      return NextResponse.json(
        { error: '기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 업데이트할 데이터 구성
    const updatedRecord = { ...records[recordIndex] };
    
    // 점수 업데이트 (제공된 경우)
    if (score !== undefined) {
      const parsedScore = Number.parseInt(score.toString(), 10);
      
      if (Number.isNaN(parsedScore) || parsedScore < 0) {
        return NextResponse.json(
          { error: '유효하지 않은 점수입니다.' },
          { status: 400 }
        );
      }
      
      updatedRecord.score = parsedScore;
    }
    
    // 닉네임 업데이트 (제공된 경우)
    if (nickname !== undefined && nickname.trim() !== '') {
      updatedRecord.nickname = nickname.trim();
    }

    // 기록 업데이트
    const updatedRecords = [...records];
    updatedRecords[recordIndex] = updatedRecord;
    
    // 모든 기록 저장
    await saveRecords(updatedRecords);
    
    return NextResponse.json({ 
      success: true, 
      message: '기록이 업데이트되었습니다.' 
    });
  } catch (error) {
    logger.error('점수 업데이트 오류:', error);
    return NextResponse.json(
      { error: '점수 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}
