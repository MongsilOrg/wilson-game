import { DiscordUser, DiscordGuildMember } from '@/types/auth';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/env';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const GUILD_ID = getEnv('DISCORD_GUILD_ID') || '1129730102633189376';
const BOT_TOKEN = getEnv('DISCORD_BOT_TOKEN');

// 학적 인증으로 인정하는 역할. 서버에서 역할을 새로 파면 env로 덮어쓴다.
const VERIFIED_ROLE_IDS = (
  process.env.DISCORD_VERIFIED_ROLE_IDS ||
  '1406632649686253649,1406620470307979344,1129731819198222417'
)
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

if (!BOT_TOKEN) {
  logger.warn('DISCORD_BOT_TOKEN이 설정되지 않았습니다. 서버 멤버십 확인이 작동하지 않을 수 있습니다.');
}

/**
 * Discord API가 일시적으로 응답하지 못한 상태. 404(미가입)와 구분해야
 * 정상 멤버에게 "서버에 가입하세요" 안내가 잘못 뜨는 것을 막을 수 있다.
 */
export class DiscordUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DiscordUnavailableError';
  }
}

/**
 * Discord API 호출 헬퍼
 * @returns 404면 null, 성공이면 JSON
 * @throws {DiscordUnavailableError} 그 외 실패
 */
async function discordApiRequest(endpoint: string, options: RequestInit = {}) {
  if (!BOT_TOKEN) {
    throw new DiscordUnavailableError('DISCORD_BOT_TOKEN이 설정되지 않았습니다.');
  }

  let response: Response;
  try {
    response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (error) {
    logger.error('Discord API 요청 실패:', error);
    throw new DiscordUnavailableError('Discord API에 연결할 수 없습니다.', { cause: error });
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    // 응답 본문에 내부 정보가 섞일 수 있어 상태 코드만 남긴다.
    logger.error(`Discord API 오류: ${response.status}`);
    throw new DiscordUnavailableError(`Discord API 오류: ${response.status}`);
  }

  return response.json();
}

/**
 * 사용자 정보 가져오기
 */
export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorMessage = `Discord 사용자 정보를 가져올 수 없습니다. (${response.status})`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 서버 멤버십 확인 (봇 토큰 사용)
 */
export async function checkGuildMembership(userId: string): Promise<boolean> {
  const member = await getGuildMember(userId);
  return member !== null;
}

/**
 * 서버 멤버 정보 가져오기 (닉네임, 아바타 포함)
 */
export async function getGuildMember(userId: string): Promise<DiscordGuildMember | null> {
  return await discordApiRequest(
    `/guilds/${GUILD_ID}/members/${encodeURIComponent(userId)}`
  ) as DiscordGuildMember | null;
}

/**
 * Discord 아바타 URL 생성
 */
export function getDiscordAvatarUrl(userId: string, avatar: string | null, discriminator?: string): string {
  if (avatar) {
    const extension = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${extension}`;
  }
  // 기본 아바타 (discriminator 기반, 새로운 사용자는 0)
  const defaultAvatar = discriminator ? parseInt(discriminator) % 5 : 0;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
}

/**
 * 서버 멤버의 표시 이름 가져오기 (서버 닉네임 또는 전역 이름 또는 사용자명)
 */
export function getDisplayName(member: DiscordGuildMember | null, user: DiscordUser): string {
  if (member?.nick) {
    return member.nick;
  }
  if (user.global_name) {
    return user.global_name;
  }
  return user.username;
}

/**
 * 서버 멤버의 아바타 URL 가져오기 (서버 아바타 또는 전역 아바타)
 */
export function getMemberAvatarUrl(member: DiscordGuildMember | null, user: DiscordUser): string {
  // 서버별 아바타가 있으면 사용
  if (member?.avatar && user.id) {
    return `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${user.id}/avatars/${member.avatar}.${member.avatar.startsWith('a_') ? 'gif' : 'png'}`;
  }
  // 전역 아바타 사용
  return getDiscordAvatarUrl(user.id, user.avatar, user.discriminator);
}

/**
 * 이미 조회한 멤버 객체로 학적 인증 여부 판정 (추가 API 호출 없음)
 */
export function isAcademicVerifiedMember(member: DiscordGuildMember | null): boolean {
  if (!member || !Array.isArray(member.roles)) {
    return false;
  }
  return member.roles.some((roleId) => VERIFIED_ROLE_IDS.includes(roleId));
}

/**
 * 학적 인증 확인 (특정 역할 보유 여부 확인)
 */
export async function checkAcademicVerification(userId: string): Promise<boolean> {
  if (!BOT_TOKEN) {
    return false;
  }

  const member = await getGuildMember(userId);
  return isAcademicVerifiedMember(member);
}

