/**
 * 환경별 로깅 유틸리티
 * 개발: console 사용
 * 프로덕션: 조건부 로깅 (에러만)
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

interface Logger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * 프로덕션 환경에서 로그 레벨 제어
 */
const shouldLog = (level: 'log' | 'error' | 'warn' | 'info' | 'debug'): boolean => {
  if (isDevelopment) return true;
  if (isProduction) {
    // 프로덕션에서는 error와 warn만 로깅
    return level === 'error' || level === 'warn';
  }
  return true;
};

export const logger: Logger = {
  log: (...args: unknown[]) => {
    if (shouldLog('log')) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.info(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.debug(...args);
    }
  },
};

