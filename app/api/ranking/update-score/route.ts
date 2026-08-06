import { NextResponse } from 'next/server';
import { mutateRecords, RecordStoreError } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { GRID_WIDTH, GRID_HEIGHT } from '@/types/game';

const MAX_SCORE = GRID_WIDTH * GRID_HEIGHT;

export async function POST(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const discordId = body?.discordId;
    const score = body?.score;
    const nickname = body?.nickname;

    if (typeof discordId !== 'string' || !discordId) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (score !== undefined && (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE)) {
      return NextResponse.json(
        { error: '유효하지 않은 점수입니다.' },
        { status: 400 }
      );
    }

    if (nickname !== undefined && typeof nickname !== 'string') {
      return NextResponse.json(
        { error: '유효하지 않은 닉네임입니다.' },
        { status: 400 }
      );
    }

    const found = await mutateRecords((records) => {
      const index = records.findIndex((r) => r.discordId === discordId);
      if (index === -1) {
        return { records, result: false };
      }

      const updated = { ...records[index] };
      if (score !== undefined) {
        updated.score = score;
      }
      if (typeof nickname === 'string' && nickname.trim() !== '') {
        updated.nickname = nickname.trim();
      }

      const next = [...records];
      next[index] = updated;
      return { records: next, result: true };
    });

    if (!found) {
      return NextResponse.json(
        { error: '기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '기록이 업데이트되었습니다.',
    });
  } catch (error) {
    return handleError('점수 업데이트', error, '점수 업데이트에 실패했습니다.');
  }
}

/**
 * 기록 삭제. discordId가 없는 인증 도입 이전 기록은 nickname으로 지운다.
 */
export async function DELETE(request: Request) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await request.json().catch(() => null);
    const discordId = body?.discordId;
    const nickname = body?.nickname;

    if (typeof discordId !== 'string' && typeof nickname !== 'string') {
      return NextResponse.json(
        { error: 'discordId 또는 nickname이 필요합니다.' },
        { status: 400 }
      );
    }

    const removed = await mutateRecords((records) => {
      const next = records.filter((r) => {
        if (typeof discordId === 'string') return r.discordId !== discordId;
        return !(r.discordId === undefined && r.nickname === nickname);
      });
      return { records: next, result: records.length - next.length };
    });

    if (removed === 0) {
      return NextResponse.json(
        { error: '기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${removed}개의 기록이 삭제되었습니다.`,
    });
  } catch (error) {
    return handleError('기록 삭제', error, '기록 삭제에 실패했습니다.');
  }
}

function handleError(label: string, error: unknown, message: string) {
  logger.error(`${label} 오류:`, error);

  if (error instanceof RecordStoreError) {
    return NextResponse.json(
      { error: '기록 저장소를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: message }, { status: 500 });
}
