'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, ExternalLink } from 'lucide-react';

type ErrorType = 'NOT_MEMBER' | 'NOT_VERIFIED';

interface LoginErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorType: ErrorType | null;
}

export function LoginErrorDialog({ open, onOpenChange, errorType }: LoginErrorDialogProps) {
  if (!errorType) return null;

  const isNotMember = errorType === 'NOT_MEMBER';
  const title = isNotMember 
    ? '루미아 캠퍼스 서버 가입이 필요합니다'
    : '학적 인증이 필요합니다';
  
  const description = isNotMember
    ? '윌슨게임을 이용하려면 루미아 캠퍼스 디스코드 서버에 가입하고 학적 인증을 완료해주세요.'
    : '윌슨게임을 이용하려면 루미아 캠퍼스에서 학적 인증을 완료해주세요.';

  const details = isNotMember
    ? [
        '루미아 캠퍼스 디스코드 서버에 가입되어 있지 않습니다.',
        '아래 링크를 통해 루미아 캠퍼스 서버에 가입해주세요.',
        '가입 후 반드시 학적 인증을 완료해야 합니다.',
        '학적 인증 완료 후 잠시 기다린 뒤 다시 로그인을 시도해주세요.',
      ]
    : [
        '루미아 캠퍼스 디스코드 서버에는 가입되어 있지만, 학적 인증 역할이 부여되지 않았습니다.',
        '루미아 캠퍼스 서버에서 학적 인증을 완료해주세요.',
        '인증 완료 후 잠시 기다린 뒤 다시 로그인을 시도해주세요.',
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg mx-4 rounded-3xl border border-blue-200 dark:border-blue-800 shadow-2xl px-6 sm:px-8 pt-8 pb-6 space-y-6 bg-blue-50 dark:bg-blue-950/20">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Info className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-blue-700 dark:text-blue-300">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">다음 사항을 확인해주세요:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2">
              {details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          </div>
          
          <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
            <a
              href="https://discord.gg/EpBHHbQrMv"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-full text-base font-semibold h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:translate-y-[1px] gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {isNotMember ? '루미아 캠퍼스 가입하기' : '루미아 캠퍼스로 이동'}
            </a>
          </div>
          
          <p className="text-xs text-blue-700 dark:text-blue-300 pt-2 border-t border-blue-200 dark:border-blue-800">
            문제가 계속되면 루미아 캠퍼스 디스코드 서버 관리자에게 문의해주세요.
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

