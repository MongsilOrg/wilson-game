import DiscordProvider from 'next-auth/providers/discord';
import { checkGuildMembership, getGuildMember, getDisplayName, getMemberAvatarUrl } from '@/lib/discord-api';
import { SessionUser, DiscordProfile } from '@/types/auth';
import { validateEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

// 환경 변수 검증 (앱 시작 시)
try {
  validateEnv();
} catch (error) {
  logger.error('환경 변수 검증 실패:', error instanceof Error ? error.message : String(error));
  // 프로덕션에서는 앱 시작을 막지만, 개발 환경에서는 경고만
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    throw error;
  }
}

const env = validateEnv();

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'identify guilds',
        },
      },
    }),
  ],
  callbacks: {
    async signIn(params: any) {
      const { user, account, profile } = params;
      
      if (!account || !profile) {
        return false;
      }

      // Discord 사용자 ID 가져오기
      const discordId = (profile as DiscordProfile).id;
      
      // 서버 멤버십 확인
      const isMember = await checkGuildMembership(discordId);
      
      // 세션에 멤버십 정보 저장
      user.isMember = isMember;
      user.discordId = discordId;

      return true;
    },
    async jwt(params: any) {
      const { token, user, account, profile } = params;
      
      // 초기 로그인 시
      if (account && profile) {
        const discordProfile = profile as DiscordProfile;
        const discordId = discordProfile.id;
        const username = discordProfile.username;
        const globalName = discordProfile.global_name ?? null;
        const avatar = discordProfile.avatar ?? null;
        const discriminator = discordProfile.discriminator;

        // 서버 멤버십 확인
        const isMember = await checkGuildMembership(discordId);
        
        // 서버 멤버 정보 가져오기 (닉네임, 아바타)
        let displayName = globalName || username;
        let avatarUrl = avatar 
          ? `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}`
          : `https://cdn.discordapp.com/embed/avatars/${parseInt(discriminator || '0') % 5}.png`;
        
        if (isMember) {
          const member = await getGuildMember(discordId);
          if (member) {
            displayName = getDisplayName(member, {
              id: discordId,
              username,
              discriminator,
              avatar,
              global_name: globalName,
            });
            avatarUrl = getMemberAvatarUrl(member, {
              id: discordId,
              username,
              discriminator,
              avatar,
              global_name: globalName,
            });
          }
        }

        token.discordId = discordId;
        token.name = displayName;
        token.picture = avatarUrl;
        token.isMember = isMember;
      }

      return token;
    },
    async session(params: any) {
      const { session, token } = params;
      
      if (session.user) {
        (session.user as SessionUser).id = token.sub || '';
        (session.user as SessionUser).discordId = token.discordId as string;
        (session.user as SessionUser).isMember = token.isMember as boolean;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: env.NEXTAUTH_SECRET,
  // 개발 환경에서 localhost를 신뢰할 수 있는 호스트로 설정
  trustHost: true,
};

