export type GameState = 'waiting' | 'playing' | 'gameOver';

export interface GameRecord {
  nickname: string;
  score: number;
  date: string;
}

export interface SelectedArea {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface RemovingAnimation {
  coords: [number, number][];
  progress: number;
}

export const GRID_WIDTH = 17;
export const GRID_HEIGHT = 10;

