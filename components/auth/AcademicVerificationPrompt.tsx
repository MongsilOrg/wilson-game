'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { GraduationCap, RefreshCw, AlertCircle, ExternalLink, LogOut } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { signOut, useSession as useNextAuthSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';

export function AcademicVerificationPrompt() {
  const { isVerified, update } = useSession();
  const { data: session, update: updateSession } = useNextAuthSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const refreshCompletedRef = useRef(false);
  const isVerifiedRef = useRef(isVerified);

  // isVerified 값이 변경될 때마다 ref 업데이트
  useEffect(() => {
    isVerifiedRef.current = isVerified;
  }, [isVerified]);

  // 인증 상태가 변경되면 에러 다이얼로그 닫기
  useEffect(() => {
    if (isVerified) {
      setShowErrorDialog(false);
      refreshCompletedRef.current = false;
    }
  }, [isVerified]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setShowErrorDialog(false);
    refreshCompletedRef.current = false;
    
    try {
      // 세션 업데이트 (JWT 콜백에서 학적 인증 상태 재확인)
      await update();
      
      // 세션이 반영될 때까지 폴링 (최대 5초)
      const maxWaitTime = 5000;
      const pollInterval = 200;
      const startTime = Date.now();
      let verified = false;
      
      // 세션 상태를 직접 확인하기 위해 폴링
      while (Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // 세션을 강제로 다시 가져오기 (주기적으로 호출)
        await updateSession();
        
        // isVerifiedRef를 통해 최신 값을 확인
        if (isVerifiedRef.current === true) {
          // 인증이 완료되었으면 폴링 중단
          console.log('[AcademicVerification] 인증 완료 확인됨');
          verified = true;
          break;
        }
      }
      
      // 폴링 완료 후 최종 상태 확인을 위해 추가 대기 및 세션 재확인
      await new Promise(resolve => setTimeout(resolve, 500));
      await updateSession();
      
      // 최종 확인: 인증이 완료되었으면 페이지를 새로고침하여 UI 업데이트
      if (verified || isVerifiedRef.current === true) {
        console.log('[AcademicVerification] 인증 완료, 페이지 새로고침');
        window.location.reload();
        return;
      }
      
    } catch (error) {
      console.error('세션 업데이트 오류:', error);
    } finally {
      setIsRefreshing(false);
      refreshCompletedRef.current = true;
    }
  };

  // 새로고침 완료 후 인증 상태 확인
  useEffect(() => {
    // 새로고침이 완료되었고, 인증이 안 되었을 때만 에러 다이얼로그 표시
    if (refreshCompletedRef.current && !isRefreshing && !isVerified) {
      console.log('[AcademicVerification] 새로고침 완료, 인증 미완료, 에러 다이얼로그 표시');
      setShowErrorDialog(true);
      refreshCompletedRef.current = false;
    }
  }, [isRefreshing, isVerified]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              학적 인증이 필요합니다
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              게임을 플레이하려면 학적 인증을 완료해주세요
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>윌슨게임을 플레이하려면 루미아 캠퍼스에서 학적 인증을 완료해야 합니다.</p>
          <p>아래 링크를 통해 루미아 캠퍼스에 접속하여 학적 인증을 완료한 후, 새로고침 버튼을 눌러주세요.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://discord.gg/EpBHHbQrMv"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-full text-base font-semibold h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:translate-y-[1px] gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            루미아 캠퍼스 가입하기
          </a>
          
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex-1 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/50"
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
                인증 후 새로고침
              </>
            )}
          </Button>
        </div>
        
        {/* 로그아웃 버튼 */}
        <div className="flex justify-end pt-2 border-t border-blue-200 dark:border-blue-800">
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
          >
            <LogOut className="h-4 w-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </CardContent>

      {/* 에러 메시지 다이얼로그 */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-lg mx-4 rounded-3xl border border-amber-300 dark:border-amber-700 shadow-2xl px-6 sm:px-8 pt-8 pb-6 space-y-6 bg-amber-50 dark:bg-amber-950/30">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100">
              아직 학적 인증이 완료되지 않았습니다
            </DialogTitle>
            <DialogDescription className="text-sm text-amber-800 dark:text-amber-200">
              다음 사항을 확인해주세요:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-amber-800 dark:text-amber-200">
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>루미아 캠퍼스 디스코드 서버에 가입되어 있는지 확인</li>
              <li>학적 인증 역할이 부여되었는지 확인</li>
              <li>학적 인증을 완료한 후 잠시 기다린 뒤 다시 시도</li>
            </ul>
            <p className="mt-4 pt-4 border-t border-amber-300 dark:border-amber-700 text-xs">
              문제가 계속되면 루미아 캠퍼스 디스코드 서버 관리자에게 문의해주세요.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowErrorDialog(false)}
              variant="outline"
              className="border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
