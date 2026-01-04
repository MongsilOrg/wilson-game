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
export interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
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

export interface SessionUser {
  id: string;
  name: string;
  image: string | null;
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

