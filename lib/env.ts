/**
 * 환경 변수 검증 유틸리티
 * 프로덕션 배포 전 필수 환경 변수 확인
 */

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';

interface EnvConfig {
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_GUILD_ID: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL?: string; // 프로덕션에서만 필수
}

/**
 * 필수 환경 변수 검증
 * 누락 시 명확한 에러 메시지와 함께 예외 발생
 */
export function validateEnv(): EnvConfig {
  const missing: string[] = [];

  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1129730102633189376';
  const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
  const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

  if (!DISCORD_CLIENT_ID) missing.push('DISCORD_CLIENT_ID');
  if (!DISCORD_CLIENT_SECRET) missing.push('DISCORD_CLIENT_SECRET');
  if (!DISCORD_BOT_TOKEN) missing.push('DISCORD_BOT_TOKEN');
  if (!NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET');
  
  // 프로덕션 환경에서만 NEXTAUTH_URL 필수
  if ((isProduction || isVercel) && !NEXTAUTH_URL) {
    missing.push('NEXTAUTH_URL');
  }

  if (missing.length > 0) {
    const errorMessage = `필수 환경 변수가 누락되었습니다:\n${missing.join('\n')}\n\n프로덕션 배포 전 .env 파일을 확인해주세요.`;
    throw new Error(errorMessage);
  }

  // 검증 후에는 모든 값이 확실히 존재하므로 타입 단언 사용
  return {
    DISCORD_CLIENT_ID: DISCORD_CLIENT_ID as string,
    DISCORD_CLIENT_SECRET: DISCORD_CLIENT_SECRET as string,
    DISCORD_BOT_TOKEN: DISCORD_BOT_TOKEN as string,
    DISCORD_GUILD_ID: DISCORD_GUILD_ID as string,
    NEXTAUTH_SECRET: NEXTAUTH_SECRET as string,
    NEXTAUTH_URL: NEXTAUTH_URL,
  };
}

/**
 * 환경 변수 안전하게 가져오기 (검증 없이)
 * 개발 환경에서만 사용 권장
 */
export function getEnv(key: keyof EnvConfig): string | undefined {
  return process.env[key];
}

