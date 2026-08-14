import type { NextAuthConfig } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import {
  getGuildMember,
  getDisplayName,
  getMemberAvatarUrl,
  isAcademicVerifiedMember,
} from '@/lib/discord-api';
import { DiscordProfile } from '@/types/auth';
import { validateEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

let env: ReturnType<typeof validateEnv>;
try {
  env = validateEnv();
} catch (error) {
  logger.error('환경 변수 검증 실패:', error instanceof Error ? error.message : String(error));
  throw error; // 유효한 값 없이는 NextAuth를 구성할 수 없으므로 환경 구분 없이 중단
}

/** 로그인 차단 사유를 요청 본인에게만 전달하도록 리다이렉트 URL로 실어 보낸다. */
function accessDeniedUrl(errorType: 'NOT_MEMBER' | 'NOT_VERIFIED' | 'TEMPORARY_ERROR'): string {
  return `/?error=AccessDenied&errorType=${errorType}`;
}

export const authConfig: NextAuthConfig = {
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: { scope: 'identify guilds' },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile) return false;

      // Discord 사용자 ID 가져오기
      const discordId = (profile as unknown as DiscordProfile).id;

      let member;
      try {
        member = await getGuildMember(discordId);
      } catch (error) {
        // Discord가 일시적으로 응답하지 못한 것을 미가입으로 단정x
        logger.error('로그인 중 서버 멤버십 확인 실패:', error);
        return accessDeniedUrl('TEMPORARY_ERROR');
      }

      // 서버에 가입하지 않은 경우 로그인 차단
      if (!member) return accessDeniedUrl('NOT_MEMBER');

      // 학적 인증 역할이 없는 경우 로그인 차단
      if (!isAcademicVerifiedMember(member)) return accessDeniedUrl('NOT_VERIFIED');

      // 세션에 멤버십 정보 저장
      user.isMember = true;
      user.discordId = discordId;
      user.isVerified = true;

      return true;
    },
    async jwt({ token, account, profile, trigger }) {

      // 초기 로그인 시 (signIn에서 이미 검증 완료)
      if (account && profile) {
        const discordProfile = profile as unknown as DiscordProfile;
        const discordId = discordProfile.id;
        const username = discordProfile.username;
        const globalName = discordProfile.global_name ?? null;
        const avatar = discordProfile.avatar ?? null;
        const discriminator = discordProfile.discriminator;

        // signIn에서 이미 검증을 통과했을 때만 이 분기에 도달하므로 그대로 확정

        // 서버 멤버 정보 가져오기 (닉네임, 아바타)
        let displayName = globalName || username;
        let avatarUrl = avatar
          ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(discriminator || '0') % 5}.png`;

        try {
          const member = await getGuildMember(discordId);
          if (member) {
            displayName = getDisplayName(member, { id: discordId, username, discriminator, avatar, global_name: globalName });
            avatarUrl = getMemberAvatarUrl(member, { id: discordId, username, discriminator, avatar, global_name: globalName });
          }
        } catch (error) {
          logger.error('로그인 중 표시 이름/아바타 조회 실패, 기본값 사용:', error);
        }

        token.discordId = discordId;
        token.name = displayName;
        token.picture = avatarUrl;
        token.isMember = true;
        token.isVerified = true;
      } else if (token.discordId && trigger === 'update') {
        // 사용자가 update()를 호출했을 때 멤버십과 학적 인증을 재확인
        const discordId = token.discordId as string;

        try {
          const member = await getGuildMember(discordId);
          token.isMember = Boolean(member);
          token.isVerified = isAcademicVerifiedMember(member);

          if (member) {
            token.name = getDisplayName(member, {
              id: discordId,
              username: (token.name as string) || discordId,
              discriminator: '0',
              avatar: null,
              global_name: null,
            });
          }
        } catch (error) {
          // 재확인 실패 시 기존 플래그를 유지한다. 쓰기 경로는 서버에서 다시 검사
          logger.error('세션 갱신 중 멤버십 확인 실패:', error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.discordId = token.discordId as string;
        session.user.isMember = token.isMember as boolean;
        session.user.isVerified = token.isVerified as boolean;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  pages: { signIn: '/' },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  secret: env.NEXTAUTH_SECRET,
  // 개발 환경에서 localhost를 신뢰할 수 있는 호스트로 설정
  trustHost: true,
   // NextAuth 로깅 설정 (개발 환경에서만 디버그 로그 표시)
  debug: process.env.NODE_ENV === 'development',
};