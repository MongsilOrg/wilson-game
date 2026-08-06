import { NextResponse } from 'next/server';
import { getRecords, mutateRecords, RecordStoreError } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/admin';
import { logger } from '@/lib/logger';
import { getGuildMember, getDisplayName, getMemberAvatarUrl } from '@/lib/discord-api';
import { DiscordUser } from '@/types/auth';
import { GameRecord } from '@/types/game';

export async function POST() {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    // 갱신은 Discord 조회가 필요해 mutateRecords 바깥에서 먼저 끝낸다.
    const records = await getRecords();

    const resolved = new Map<string, { nickname: string; avatarUrl?: string }>();

    for (const record of records) {
      if (!record.discordId || resolved.has(record.discordId)) continue;

      try {
        const member = await getGuildMember(record.discordId);
        if (!member) continue;

        const discordUser: DiscordUser = member.user ?? {
          id: record.discordId,
          username: record.nickname,
          discriminator: '0',
          avatar: null,
          global_name: null,
        };

        resolved.set(record.discordId, {
          nickname: getDisplayName(member, discordUser),
          avatarUrl: getMemberAvatarUrl(member, discordUser) || undefined,
        });
      } catch (error) {
        logger.error(`기록 업데이트 실패 (discordId: ${record.discordId}):`, error);
      }
    }

    const updatedCount = await mutateRecords((current) => {
      let count = 0;
      const next: GameRecord[] = current.map((record) => {
        const info = record.discordId ? resolved.get(record.discordId) : undefined;
        if (!info) return record;
        count += 1;
        return { ...record, nickname: info.nickname, avatarUrl: info.avatarUrl ?? record.avatarUrl };
      });
      return { records: next, result: count };
    });

    return NextResponse.json({
      success: true,
      message: `${updatedCount}개의 기록이 업데이트되었습니다.`,
    });
  } catch (error) {
    logger.error('랭킹 새로고침 오류:', error);

    if (error instanceof RecordStoreError) {
      return NextResponse.json(
        { error: '기록 저장소를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '랭킹 새로고침에 실패했습니다.' },
      { status: 500 }
    );
  }
}
