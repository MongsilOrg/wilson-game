import { describe, it, expect } from 'vitest';
import { getDiscordAvatarUrl, getMemberAvatarUrl, parseAvatarHash } from '@/lib/discord-api';
import { DiscordGuildMember, DiscordUser } from '@/types/auth';

const USER: DiscordUser = {
  id: '111',
  username: 'tester',
  discriminator: '0',
  avatar: 'abc123',
  global_name: null,
};

describe('parseAvatarHash', () => {
  it('일반 아바타 URL에서 해시를 꺼낸다', () => {
    expect(parseAvatarHash('https://cdn.discordapp.com/avatars/111/abc123.png')).toBe('abc123');
    expect(parseAvatarHash('https://cdn.discordapp.com/avatars/111/a_abc123.gif')).toBe('a_abc123');
  });

  it('서버 아바타 URL에서 해시를 꺼낸다', () => {
    expect(parseAvatarHash('https://cdn.discordapp.com/guilds/222/users/111/avatars/def456.png')).toBe('def456');
    expect(parseAvatarHash('https://cdn.discordapp.com/guilds/222/users/111/avatars/a_def456.gif')).toBe('a_def456');
  });

  it('기본 아바타 URL은 null', () => {
    expect(parseAvatarHash('https://cdn.discordapp.com/embed/avatars/0.png')).toBeNull();
  });

  it('URL 생성 함수가 만든 두 형식을 다시 읽는다', () => {
    expect(parseAvatarHash(getDiscordAvatarUrl(USER.id, USER.avatar))).toBe('abc123');

    const member: DiscordGuildMember = { avatar: 'a_def456', roles: [] };
    expect(parseAvatarHash(getMemberAvatarUrl(member, USER))).toBe('a_def456');
  });
});
