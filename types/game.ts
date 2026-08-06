export type GameState = 'waiting' | 'playing' | 'gameOver';

export interface GameRecord {
  nickname: string;
  score: number;
  date: string;
  avatarUrl?: string;
  discordId?: string;
}

export interface SelectedArea {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface RemovingAnimation {
  coords: [number, number][];
  // 격자에서는 즉시 지워지므로 그릴 값을 애니메이션이 들고 있어야 한다.
  values: number[];
  progress: number;
}

export const GRID_WIDTH = 17;
export const GRID_HEIGHT = 10;

