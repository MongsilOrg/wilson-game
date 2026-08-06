import { NextResponse } from 'next/server';
import { mutateRecords, RecordStoreError } from '@/lib/api-utils';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { getGuildMember, getDisplayName, getMemberAvatarUrl, isAcademicVerifiedMember } from '@/lib/discord-api';
import { DiscordUser } from '@/types/auth';
import { GRID_WIDTH, GRID_HEIGHT } from '@/types/game';

// 격자를 전부 지웠을 때의 점수가 상한이다.
const MAX_SCORE = GRID_WIDTH * GRID_HEIGHT;

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const user = session.user as { discordId: string; name: string; image: string | null; isMember: boolean; isVerified: boolean };

    if (!user.discordId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    // 세션 플래그는 로그인 시점 값이라 강퇴나 역할 회수를 반영하지 못한다. 여기서 다시 확인한다.
    const member = await getGuildMember(user.discordId);

    if (!member) {
      return NextResponse.json(
        { error: '서버 멤버만 기록을 저장할 수 있습니다.' },
        { status: 403 }
      );
    }

    if (!isAcademicVerifiedMember(member)) {
      return NextResponse.json(
        { error: '학적 인증이 필요합니다.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const rawScore = body?.score;

    if (typeof rawScore !== 'number' || !Number.isInteger(rawScore)) {
      return NextResponse.json(
        { error: '점수 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    if (rawScore < 0 || rawScore > MAX_SCORE) {
      return NextResponse.json(
        { error: '점수 범위가 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const score = rawScore;

    // DiscordUser 객체 구성
    // member.user가 있으면 사용 (Discord API가 항상 반환함)
    // 없으면 세션 정보 기반으로 구성 (fallback)
    let discordUser: DiscordUser;

    if (member.user) {
      discordUser = member.user;
    } else {
      // Fallback: 세션 정보 기반으로 구성
      // 세션의 image URL에서 avatar hash 추출 시도
      let avatar: string | null = null;
      const discriminator = '0';

      // 세션 image URL 형식: https://cdn.discordapp.com/avatars/{userId}/{avatar}.{ext}
      // 또는 https://cdn.discordapp.com/guilds/{guildId}/users/{userId}/avatars/{avatar}.{ext}
      if (user.image) {
        const avatarMatch = user.image.match(/\/(?:avatars|guilds\/[^/]+\/users\/[^/]+\/avatars)\/[^/]+\/([^/.]+)\./);
        if (avatarMatch) {
          avatar = avatarMatch[1];
        }
      }

      // 세션 name을 username으로 사용 (실제로는 global_name일 수도 있지만 구분 불가)
      discordUser = {
        id: user.discordId,
        username: user.name,
        discriminator,
        avatar,
        global_name: null,
      };
    }

    // 서버 멤버 정보를 사용하여 닉네임과 아바타 URL 가져오기
    const nickname = getDisplayName(member, discordUser);
    const avatarUrl = getMemberAvatarUrl(member, discordUser);

    // KST 시간 기준으로 저장 (서버 시간대를 KST로 설정하거나 UTC+9 계산)
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));

    const updated = await mutateRecords((records) => {
      // 같은 discordId를 가진 모든 기록 찾기 (닉네임 변경 시 중복 방지)
      const existingRecords = records.filter(
        (r) => r.discordId === user.discordId
      );

      // 기존 기록 중 최고 점수 찾기
      const maxExistingScore = existingRecords.length > 0
        ? Math.max(...existingRecords.map((r) => r.score))
        : -1;

      // 새 점수가 기존 최고 점수보다 높은 경우에만 업데이트
      if (score <= maxExistingScore) {
        return { records, result: false };
      }

      // 같은 discordId를 가진 모든 기록 제거 (닉네임 변경으로 인한 중복 방지)
      const nextRecords = records.filter(
        (r) => r.discordId !== user.discordId
      );

      nextRecords.push({
        nickname,
        score,
        date: kstTime.toISOString(),
        avatarUrl: avatarUrl || undefined,
        discordId: user.discordId,
      });

      return { records: nextRecords, result: true };
    });

    if (!updated) {
      return NextResponse.json({ success: true, message: '기존 기록이 더 높거나 같습니다.' });
    }

    return NextResponse.json({ success: true, message: '기록이 저장되었습니다.' });
  } catch (error) {
    logger.error('기록 저장 오류:', error);

    if (error instanceof RecordStoreError) {
      return NextResponse.json(
        { error: '기록 저장소를 사용할 수 없습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '기록 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
