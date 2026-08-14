import { DefaultSession } from 'next-auth';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

/**
 * NextAuth Discord Provider의 profile 타입
 */

export interface DiscordProfile extends DiscordUser {
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export interface DiscordGuildMember {
  user?: DiscordUser;
  nick?: string | null;
  avatar?: string | null;
  roles?: string[];
}

export interface SessionUser extends NonNullable<DefaultSession['user']> {
  id: string;
  discordId: string;
  isMember: boolean;
  isVerified: boolean;
}

declare module 'next-auth' {
  interface User {
    discordId?: string;
    isMember?: boolean;
    isVerified?: boolean;
  }

  interface Session {
    user: SessionUser;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    discordId?: string;
    isMember?: boolean;
    isVerified?: boolean;
  }
}

