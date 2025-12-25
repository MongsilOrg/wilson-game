import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 랜덤 정수 생성 (min ~ max 포함)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 두 점 사이의 거리 계산
 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * 시간을 MM:SS 형식으로 변환
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * 배열에서 중복 제거
 */
export function uniqueArray<T extends [number, number]>(array: T[]): T[] {
  return array.filter((value, index, self) => 
    self.findIndex(v => v[0] === value[0] && v[1] === value[1]) === index
  );
}

/**
 * 두 좌표가 같은지 확인
 */
export function isSameCoord(coord1: [number, number], coord2: [number, number]): boolean {
  return coord1[0] === coord2[0] && coord1[1] === coord2[1];
}

/**
 * 좌표가 배열에 포함되어 있는지 확인
 */
export function includesCoord(array: [number, number][], coord: [number, number]): boolean {
  return array.some(c => isSameCoord(c, coord));
}

/**
 * HTML 이스케이프
 */
export function escapeHtml(text: string): string {
  if (typeof document === 'undefined') {
    // 서버 사이드에서는 간단한 이스케이프만 수행
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

