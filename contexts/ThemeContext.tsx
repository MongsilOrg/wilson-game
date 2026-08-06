'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { useIsClient } from '@/hooks/useIsClient';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'wilson-game-theme';
const THEME_CHANGE_EVENT = 'wilson-game-theme-change';

interface ThemeContextType {
  theme: Theme;
  mounted: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

/**
 * 현재 테마를 DOM에서 읽는다. 하이드레이션 전에 실행되는 인라인 스크립트가
 * 이미 값을 적용해 두므로 DOM이 사실상의 저장소다.
 */
function getSnapshot(): Theme {
  const root = document.documentElement;

  const dataTheme = root.getAttribute('data-theme');
  if (dataTheme === 'dark' || dataTheme === 'light') {
    return dataTheme;
  }

  if (root.classList.contains('dark')) return 'dark';

  const stored = readStoredTheme();
  if (stored) return stored;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getServerSnapshot(): Theme {
  return 'light';
}

function applyTheme(newTheme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', newTheme === 'dark');
  root.setAttribute('data-theme', newTheme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleSystemChange = () => {
    // 사용자가 직접 고른 테마가 있으면 시스템 설정에 따라 바꾸지 않는다.
    if (readStoredTheme()) return;
    applyTheme(mediaQuery.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handleSystemChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);

  return () => {
    mediaQuery.removeEventListener('change', handleSystemChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mounted = useIsClient();

  const setTheme = useCallback((newTheme: Theme) => {
    applyTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      logger.error('Failed to save theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getSnapshot() === 'light' ? 'dark' : 'light');
  }, [setTheme]);

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
