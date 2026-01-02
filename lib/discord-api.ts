import { DiscordUser, DiscordGuildMember } from '@/types/auth';
import { logger } from '@/lib/logger';
import { getEnv } from '@/lib/env';

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const GUILD_ID = getEnv('DISCORD_GUILD_ID') || '1129730102633189376';
const BOT_TOKEN = getEnv('DISCORD_BOT_TOKEN');

if (!BOT_TOKEN) {
  logger.warn('DISCORD_BOT_TOKEN이 설정되지 않았습니다. 서버 멤버십 확인이 작동하지 않을 수 있습니다.');
}

/**
 * Discord API 호출 헬퍼
 */
async function discordApiRequest(endpoint: string, options: RequestInit = {}) {
  if (!BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN이 설정되지 않았습니다.');
  }

  const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    const errorMessage = `Discord API 오류: ${response.status} ${errorText}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
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
  if (!BOT_TOKEN) {
    return false;
  }

  try {
    const member = await discordApiRequest(`/guilds/${GUILD_ID}/members/${userId}`) as DiscordGuildMember | null;
    return member !== null && member !== undefined;
  } catch (error) {
    // 404는 멤버가 아니라는 의미
    if (error instanceof Error && error.message.includes('404')) {
      return false;
    }
    logger.error('서버 멤버십 확인 오류:', error);
    return false;
  }
}

/**
 * 서버 멤버 정보 가져오기 (닉네임, 아바타 포함)
 */
export async function getGuildMember(userId: string): Promise<DiscordGuildMember | null> {
  if (!BOT_TOKEN) {
    return null;
  }

  try {
    const member = await discordApiRequest(`/guilds/${GUILD_ID}/members/${userId}`) as DiscordGuildMember;
    return member;
  } catch (error) {
    // 404는 멤버가 아니라는 의미
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    logger.error('서버 멤버 정보 가져오기 오류:', error);
    return null;
  }
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

