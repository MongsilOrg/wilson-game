'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { logger } from '@/lib/logger';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'wilson-game-theme';

interface ThemeContextType {
  theme: Theme;
  mounted: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyTheme(newTheme: Theme) {
  if (typeof window === 'undefined') return;
  
  const root = document.documentElement;
  if (newTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// 초기 테마를 동기적으로 읽는 함수 (초기 스크립트가 실행된 후)
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  // 1. data-theme attribute를 우선 확인 (초기 스크립트가 설정한 값)
  const dataTheme = document.documentElement.getAttribute('data-theme');
  if (dataTheme === 'dark' || dataTheme === 'light') {
    return dataTheme;
  }
  
  // 2. html 태그의 클래스 확인 (초기 스크립트가 설정한 값)
  const hasDarkClass = document.documentElement.classList.contains('dark');
  if (hasDarkClass) return 'dark';
  
  // 3. localStorage 확인 (초기 스크립트와 동일한 로직)
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
      return storedTheme;
    }
  } catch (e) {
    // localStorage 접근 실패 시 무시
  }
  
  // 4. 시스템 테마 감지
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 서버와 클라이언트가 동일하게 렌더링되도록 초기값은 항상 'light'
  // 실제 테마는 useEffect에서 설정하여 Hydration 오류 방지
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // 마운트 후 한 번만 실행하여 상태 동기화 및 data attribute 업데이트
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const currentTheme = getInitialTheme();
    setThemeState(currentTheme);
    // 초기 스크립트가 이미 적용했지만, 확실히 하기 위해 다시 적용
    applyTheme(currentTheme);
    // data attribute도 업데이트 (일관성 유지)
    document.documentElement.setAttribute('data-theme', currentTheme);
    setMounted(true);
  }, []);

  // 시스템 테마 변경 감지 (localStorage에 저장된 테마가 없을 때만)
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    // localStorage에 저장된 테마가 없을 때만 시스템 테마 변경 감지
    if (!storedTheme) {
      const handleChange = (e: MediaQueryListEvent) => {
        const newTheme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyTheme(newTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mounted]);

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const newTheme: Theme = prevTheme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      // data attribute도 업데이트
      if (typeof window !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch (error) {
        logger.error('Failed to save theme:', error);
      }
      return newTheme;
    });
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    // data attribute도 업데이트
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mounted, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

