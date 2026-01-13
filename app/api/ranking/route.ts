import { NextResponse } from 'next/server';
import { dedupeAndSort, getRecords } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { getGuildMember, getDisplayName, getMemberAvatarUrl } from '@/lib/discord-api';
import { DiscordUser } from '@/types/auth';

export async function GET() {
  try {
    const records = await getRecords();

    // discordId가 있는 기록에 대해 실시간으로 서버 멤버 정보 가져오기
    const updatedRecords = await Promise.all(
      records.map(async (record) => {
        if (!record.discordId) {
          return record;
        }

        try {
          const member = await getGuildMember(record.discordId);
          
          if (!member) {
            return record;
          }

          // DiscordUser 객체 구성
          let discordUser: DiscordUser;
          
          if (member.user) {
            discordUser = member.user;
          } else {
            // Fallback: 기존 기록 정보 기반으로 구성
            discordUser = {
              id: record.discordId,
              username: record.nickname,
              discriminator: '0',
              avatar: null,
              global_name: null,
            };
          }
          
          // 서버 멤버 정보를 사용하여 닉네임과 아바타 URL 가져오기
          const nickname = getDisplayName(member, discordUser);
          const avatarUrl = getMemberAvatarUrl(member, discordUser);
          
          return {
            ...record,
            nickname,
            avatarUrl: avatarUrl || record.avatarUrl,
          };
        } catch (error) {
          logger.error(`랭킹 조회 시 멤버 정보 가져오기 실패 (discordId: ${record.discordId}):`, error);
          // 에러 발생 시 기존 기록 반환
          return record;
        }
      })
    );

    // 닉네임 중복 제거 및 정렬 후 상위 10개만 반환
    return NextResponse.json(dedupeAndSort(updatedRecords, 10));
  } catch (error) {
    logger.error('랭킹 조회 오류:', error);
    return NextResponse.json(
      { error: '랭킹을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

