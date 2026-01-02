import { auth } from '@/app/api/auth/[...nextauth]/route';

/**
 * 환경별 NEXTAUTH_URL 가져오기
 */
export function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:3000';
}

/**
 * 서버 사이드에서 세션 가져오기
 * NextAuth v5에서는 auth() 함수를 사용
 */
export async function getSession() {
  return await auth();
}

