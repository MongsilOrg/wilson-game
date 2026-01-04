import NextAuth from 'next-auth';
import { authOptions, authErrorStore } from '@/lib/auth-config';
import { NextRequest, NextResponse } from 'next/server';

export const { handlers, auth } = NextAuth(authOptions);

// 커스텀 핸들러로 에러 정보를 쿼리 파라미터로 전달
async function handleRequest(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>
) {
  const url = new URL(req.url);
  
  // 에러 페이지로 리다이렉트되는 경우 에러 타입 확인
  if (url.pathname === '/api/auth/error') {
    const error = url.searchParams.get('error');
    
    // AccessDenied 에러인 경우, 임시 저장소에서 에러 타입 확인
    if (error === 'AccessDenied') {
      // Discord 콜백에서 discordId를 가져올 수 있는지 확인
      // 실제로는 쿠키나 세션에서 discordId를 가져와야 함
      // 여기서는 간단하게 모든 에러를 확인
      const errorEntries = Array.from(authErrorStore.entries());
      if (errorEntries.length > 0) {
        // 가장 최근 에러 사용 (실제로는 더 정확한 방법 필요)
        const [discordId, errorType] = errorEntries[errorEntries.length - 1];
        authErrorStore.delete(discordId); // 사용 후 삭제
        
        // 에러 타입을 쿼리 파라미터로 추가하여 리다이렉트
        const redirectUrl = new URL('/', url.origin);
        redirectUrl.searchParams.set('error', 'AccessDenied');
        redirectUrl.searchParams.set('errorType', errorType);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }
  
  const res = await handler(req);
  
  // 리다이렉트 응답인 경우 에러 타입 확인
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    if (location) {
      const locationUrl = new URL(location, url.origin);
      // 에러 페이지로 리다이렉트되는 경우
      if (locationUrl.pathname === '/api/auth/error') {
        const errorEntries = Array.from(authErrorStore.entries());
        if (errorEntries.length > 0) {
          const [discordId, errorType] = errorEntries[errorEntries.length - 1];
          authErrorStore.delete(discordId);
          
          // 에러 타입을 쿼리 파라미터로 추가하여 리다이렉트
          const redirectUrl = new URL('/', url.origin);
          redirectUrl.searchParams.set('error', 'AccessDenied');
          redirectUrl.searchParams.set('errorType', errorType);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
  }
  
  return res;
}

export async function GET(req: NextRequest) {
  return handleRequest(req, handlers.GET);
}

export async function POST(req: NextRequest) {
  return handleRequest(req, handlers.POST);
}

