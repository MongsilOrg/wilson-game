import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS || '602522819594551306')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

export function isAdmin(discordId: string | undefined): boolean {
  return Boolean(discordId) && ADMIN_DISCORD_IDS.includes(discordId as string);
}

/**
 * 관리자가 아니면 응답을 돌려주고, 관리자면 null을 돌려준다.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { discordId } = session.user as { discordId?: string };

  if (!isAdmin(discordId)) {
    return NextResponse.json({ error: '관리자만 접근할 수 있습니다.' }, { status: 403 });
  }

  return null;
}
