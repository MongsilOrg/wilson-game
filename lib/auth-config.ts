import DiscordProvider from 'next-auth/providers/discord';
import { checkGuildMembership, getGuildMember, getDisplayName, getMemberAvatarUrl, checkAcademicVerification } from '@/lib/discord-api';
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

// 에러 타입을 저장할 임시 저장소 (메모리 기반, 프로덕션에서는 Redis 등 사용 권장)
const authErrorStore = new Map<string, string>();

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
  events: {
    async signIn({ user, account, profile }) {
      // 로그인 성공 시 에러 저장소에서 해당 사용자 정보 제거
      if (user && (user as any).discordId) {
        authErrorStore.delete((user as any).discordId);
      }
    },
  },
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
      
      // 서버에 가입하지 않은 경우 로그인 차단
      if (!isMember) {
        // 에러 타입을 임시 저장소에 저장 (API 라우트에서 접근 가능하도록)
        authErrorStore.set(discordId, 'NOT_MEMBER');
        return false;
      }
      
      // 학적 인증 역할 확인
      const isVerified = await checkAcademicVerification(discordId);
      
      // 학적 인증 역할이 없는 경우 로그인 차단
      if (!isVerified) {
        // 에러 타입을 임시 저장소에 저장 (API 라우트에서 접근 가능하도록)
        authErrorStore.set(discordId, 'NOT_VERIFIED');
        return false;
      }
      
      // 세션에 멤버십 정보 저장
      user.isMember = isMember;
      user.discordId = discordId;
      user.isVerified = isVerified;

      return true;
    },
    async jwt(params: any) {
      const { token, user, account, profile, trigger } = params;
      
      // 초기 로그인 시 (signIn에서 이미 검증 완료)
      if (account && profile) {
        const discordProfile = profile as DiscordProfile;
        const discordId = discordProfile.id;
        const username = discordProfile.username;
        const globalName = discordProfile.global_name ?? null;
        const avatar = discordProfile.avatar ?? null;
        const discriminator = discordProfile.discriminator;

        // signIn에서 이미 검증되었으므로 isMember와 isVerified는 true
        const isMember = user.isMember ?? true;
        const isVerified = user.isVerified ?? true;
        
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
        token.isVerified = isVerified;
      } else if (token.discordId && trigger === 'update') {
        // 세션 업데이트 시 (사용자가 명시적으로 update() 호출)
        // 학적 인증 상태를 재확인
        const discordId = token.discordId as string;
        const isMember = await checkGuildMembership(discordId);
        const isVerified = isMember ? await checkAcademicVerification(discordId) : false;
        
        token.isMember = isMember;
        token.isVerified = isVerified;
        
        // 멤버 정보도 업데이트 (닉네임, 아바타 변경 가능성 대비)
        if (isMember) {
          const member = await getGuildMember(discordId);
          if (member) {
            // 서버 닉네임이 변경되었을 수 있으므로 업데이트
            // 하지만 기존 displayName을 유지하는 것이 더 안전할 수 있음
            // 필요시 여기서 업데이트 가능
          }
        }
      }

      return token;
    },
    async session(params: any) {
      const { session, token } = params;
      
      if (session.user) {
        (session.user as SessionUser).id = token.sub || '';
        (session.user as SessionUser).discordId = token.discordId as string;
        (session.user as SessionUser).isMember = token.isMember as boolean;
        (session.user as SessionUser).isVerified = token.isVerified as boolean;
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
  // NextAuth 로깅 설정 (개발 환경에서만 디버그 로그 표시)
  debug: process.env.NODE_ENV === 'development',
};

// 에러 저장소를 외부에서 접근 가능하도록 export
export { authErrorStore };

