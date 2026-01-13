import { NextResponse } from 'next/server';
import { getRecords, saveRecords } from '@/lib/api-utils';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getGuildMember, getDisplayName, getMemberAvatarUrl } from '@/lib/discord-api';
import { DiscordUser } from '@/types/auth';

const ADMIN_DISCORD_ID = '602522819594551306';

/**
 * 관리자 확인
 */
function isAdmin(discordId: string | undefined): boolean {
  return discordId === ADMIN_DISCORD_ID;
}

export async function POST() {
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

    // 모든 기록 가져오기
    const records = await getRecords();
    
    // discordId가 있는 기록만 필터링
    const recordsWithDiscordId = records.filter(r => r.discordId);
    
    // 각 기록의 닉네임과 아바타 URL 업데이트
    const updatedRecords = await Promise.all(
      recordsWithDiscordId.map(async (record) => {
        try {
          // 서버 멤버 정보 가져오기
          const member = await getGuildMember(record.discordId!);
          
          if (!member) {
            // 서버 멤버가 아니면 기존 기록 유지
            return record;
          }

          // DiscordUser 객체 구성
          let discordUser: DiscordUser;
          
          if (member.user) {
            discordUser = member.user;
          } else {
            // Fallback: 기존 기록 정보 기반으로 구성
            discordUser = {
              id: record.discordId!,
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
            avatarUrl: avatarUrl || undefined,
          };
        } catch (error) {
          logger.error(`기록 업데이트 실패 (discordId: ${record.discordId}):`, error);
          // 에러 발생 시 기존 기록 유지
          return record;
        }
      })
    );
    
    // discordId가 없는 기록과 업데이트된 기록 합치기
    const recordsWithoutDiscordId = records.filter(r => !r.discordId);
    const allRecords = [...recordsWithoutDiscordId, ...updatedRecords];
    
    // 모든 기록 저장
    await saveRecords(allRecords);
    
    return NextResponse.json({ 
      success: true, 
      message: `${updatedRecords.length}개의 기록이 업데이트되었습니다.` 
    });
  } catch (error) {
    logger.error('랭킹 새로고침 오류:', error);
    return NextResponse.json(
      { error: '랭킹 새로고침에 실패했습니다.' },
      { status: 500 }
    );
  }
}
