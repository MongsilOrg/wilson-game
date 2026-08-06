import { GameRecord } from '@/types/game';
import { DiscordUser } from '@/types/auth';
import { getGuildMember, getDisplayName, getMemberAvatarUrl } from '@/lib/discord-api';
import { logger } from '@/lib/logger';

const MEMBER_TTL_MS = 5 * 60 * 1000;

type CachedMember = { value: Awaited<ReturnType<typeof getGuildMember>>; expiresAt: number };

// 랭킹 조회는 인증이 없어 누구나 반복 호출할 수 있다. 캐시가 없으면 요청마다
// 표시 인원 수만큼 Discord 호출이 나가 봇 토큰의 레이트리밋을 태우고,
// 그러면 같은 토큰을 쓰는 로그인까지 막힌다.
const memberCache = new Map<string, CachedMember>();

async function getCachedMember(discordId: string) {
  const cached = memberCache.get(discordId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const value = await getGuildMember(discordId);
    memberCache.set(discordId, { value, expiresAt: Date.now() + MEMBER_TTL_MS });
    return value;
  } catch (error) {
    logger.error(`멤버 정보 조회 실패 (discordId: ${discordId}):`, error);
    // 실패는 캐시하지 않는다. 저장된 기록의 표시 정보를 그대로 쓴다.
    return null;
  }
}

/**
 * 표시할 기록에만 최신 닉네임과 아바타를 입힌다.
 */
export async function getRankingView(records: GameRecord[]): Promise<GameRecord[]> {
  return await Promise.all(
    records.map(async (record) => {
      if (!record.discordId) {
        return record;
      }

      const member = await getCachedMember(record.discordId);
      if (!member) {
        return record;
      }

      const discordUser: DiscordUser = member.user ?? {
        id: record.discordId,
        username: record.nickname,
        discriminator: '0',
        avatar: null,
        global_name: null,
      };

      return {
        ...record,
        nickname: getDisplayName(member, discordUser),
        avatarUrl: getMemberAvatarUrl(member, discordUser) || record.avatarUrl,
      };
    })
  );
}
