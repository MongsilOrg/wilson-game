import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth-config';

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * 서버 사이드에서 세션 가져오기
 * NextAuth v5에서는 auth() 함수를 사용
 */
export async function getSession() {
  return await auth();
}