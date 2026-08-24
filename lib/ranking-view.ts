import { GameRecord } from '@/types/game';
import { DiscordUser, DiscordGuildMember } from '@/types/auth';
import { getGuildMember, getDisplayName, getMemberAvatarUrl } from '@/lib/discord-api';
import { logger } from '@/lib/logger';

const MEMBER_TTL_MS = 5 * 60 * 1000;
// 실패도 잠시 캐시한다. 실패를 캐시하지 않으면 429가 나는 동안 요청마다
// 표시 인원 전원을 재조회해 429가 429를 부르는 폭주가 이어진다.
const FAILURE_TTL_MS = 60 * 1000;
// 길드 멤버 조회는 버킷이 좁아(초당 5회 수준) 10명을 동시에 쏘면 절반이 429로 죽는다.
const FETCH_CONCURRENCY = 3;

type CachedMember = { value: DiscordGuildMember | null; expiresAt: number };

// 랭킹 조회는 인증이 없어 누구나 반복 호출할 수 있다. 캐시가 없으면 요청마다
// 표시 인원 수만큼 Discord 호출이 나가 봇 토큰의 레이트리밋을 태우고,
// 그러면 같은 토큰을 쓰는 로그인까지 막힌다.
const memberCache = new Map<string, CachedMember>();

async function getCachedMember(discordId: string): Promise<DiscordGuildMember | null> {
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
    // 만료된 값이라도 다시 걸어 둔다. 표시 정보라 잠깐 낡아도 무방하다.
    memberCache.set(discordId, {
      value: cached?.value ?? null,
      expiresAt: Date.now() + FAILURE_TTL_MS,
    });
    return cached?.value ?? null;
  }
}

/** 중복을 제거한 ID 목록을 제한된 동시성으로 조회한다. */
async function fetchMembers(discordIds: string[]): Promise<Map<string, DiscordGuildMember | null>> {
  const members = new Map<string, DiscordGuildMember | null>();
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, discordIds.length) },
    async () => {
      while (cursor < discordIds.length) {
        const id = discordIds[cursor++];
        members.set(id, await getCachedMember(id));
      }
    }
  );

  await Promise.all(workers);
  return members;
}

/**
 * 표시할 기록에만 최신 닉네임과 아바타를 입힌다.
 */
export async function getRankingView(records: GameRecord[]): Promise<GameRecord[]> {
  const discordIds = [
    ...new Set(records.map((record) => record.discordId).filter((id): id is string => Boolean(id))),
  ];
  const members = await fetchMembers(discordIds);

  return records.map((record) => {
    if (!record.discordId) {
      return record;
    }

    const member = members.get(record.discordId);
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
  });
}
