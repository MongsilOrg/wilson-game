'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleClick = () => {
    toggleTheme();
  };

  // 클라이언트에서만 실제 테마 표시, 서버에서는 기본값 사용
  // 초기 스크립트가 이미 올바른 스타일을 적용했으므로 깜빡임 없음
  const displayTheme = isClient && mounted ? theme : 'light';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="h-9 w-9 touch-manipulation shrink-0 hover:bg-primary/10 transition-colors"
      aria-label={displayTheme === 'light' ? '다크모드로 전환' : '라이트모드로 전환'}
      suppressHydrationWarning
    >
      {displayTheme === 'light' ? (
        <Moon className="h-4 w-4 text-foreground transition-transform" suppressHydrationWarning />
      ) : (
        <Sun className="h-4 w-4 text-foreground transition-transform" suppressHydrationWarning />
      )}
    </Button>
  );
}

