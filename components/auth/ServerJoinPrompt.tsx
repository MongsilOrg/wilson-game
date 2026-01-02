'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

interface ServerJoinPromptProps {
  serverInviteUrl?: string;
}

export function ServerJoinPrompt({ serverInviteUrl }: ServerJoinPromptProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // 세션 갱신을 위해 로그아웃 후 다시 로그인하도록 유도
    await signOut({ callbackUrl: '/' });
  };

  const defaultInviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || 'https://discord.gg';

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/50 p-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-amber-900 dark:text-amber-100">
              서버 가입이 필요합니다
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              게임을 이용하려면 디스코드 서버에 가입해주세요
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
          <p>이 게임은 특정 디스코드 서버의 멤버만 이용할 수 있습니다.</p>
          <p>아래 링크를 통해 서버에 가입한 후, 새로고침 버튼을 눌러주세요.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            asChild
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
            size="lg"
          >
            <a
              href={serverInviteUrl || defaultInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              서버 가입하기
            </a>
          </Button>
          
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex-1 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            size="lg"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                확인 중...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                가입 후 새로고침
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

