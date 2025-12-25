import { randomInt } from './utils';
import { GRID_WIDTH, GRID_HEIGHT } from '@/types/game';

export class Grid {
  private grid: number[][];

  constructor() {
    this.grid = [];
    this.init();
  }

  /**
   * 그리드 초기화 및 랜덤 사과 배치
   */
  init(): void {
    this.grid = [];
    for (let row = 0; row < GRID_HEIGHT; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_WIDTH; col++) {
        this.grid[row][col] = randomInt(1, 9);
      }
    }
  }

  /**
   * 특정 위치의 사과 값 가져오기
   */
  getValue(row: number, col: number): number | null {
    if (this.isValidPosition(row, col)) {
      return this.grid[row][col];
    }
    return null;
  }

  /**
   * 특정 위치의 사과 제거 (0으로 설정)
   */
  remove(row: number, col: number): void {
    if (this.isValidPosition(row, col)) {
      this.grid[row][col] = 0;
    }
  }

  /**
   * 여러 위치의 사과 제거
   */
  removeMultiple(coords: [number, number][]): void {
    coords.forEach(([row, col]) => {
      this.remove(row, col);
    });
  }

  /**
   * 유효한 위치인지 확인
   */
  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < GRID_HEIGHT && col >= 0 && col < GRID_WIDTH;
  }

  /**
   * 중력 효과 적용 - 제거된 사과 위의 사과들이 떨어지도록
   */
  applyGravity(): void {
    for (let col = 0; col < GRID_WIDTH; col++) {
      // 각 열에 대해 아래에서 위로 순회하며 빈 공간 채우기
      let writeIndex = GRID_HEIGHT - 1;
      
      for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
        if (this.grid[row][col] !== 0) {
          if (writeIndex !== row) {
            this.grid[writeIndex][col] = this.grid[row][col];
            this.grid[row][col] = 0;
          }
          writeIndex--;
        }
      }
    }
  }

  /**
   * 빈 공간을 새로운 랜덤 사과로 채우기
   */
  fillEmptySpaces(): void {
    for (let row = 0; row < GRID_HEIGHT; row++) {
      for (let col = 0; col < GRID_WIDTH; col++) {
        if (this.grid[row][col] === 0) {
          this.grid[row][col] = randomInt(1, 9);
        }
      }
    }
  }

  /**
   * 그리드 전체 복사
   */
  clone(): Grid {
    const newGrid = new Grid();
    newGrid.grid = this.grid.map(row => [...row]);
    return newGrid;
  }

  /**
   * 그리드 상태 가져오기 (디버깅용)
   */
  getState(): number[][] {
    return this.grid.map(row => [...row]);
  }
}

