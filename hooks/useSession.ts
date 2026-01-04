'use client';

import { useSession as useNextAuthSession } from 'next-auth/react';
import { SessionUser } from '@/types/auth';

export function useSession() {
  const { data: session, status, update } = useNextAuthSession();
  
  return {
    user: session?.user as SessionUser | undefined,
    isAuthenticated: !!session?.user,
    isLoading: status === 'loading',
    isMember: session?.user ? (session.user as SessionUser).isMember : false,
    isVerified: session?.user ? (session.user as SessionUser).isVerified : false,
    update,
  };
}

