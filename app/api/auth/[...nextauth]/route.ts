import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export const { handlers, auth } = NextAuth(authOptions);

export const { GET, POST } = handlers;

