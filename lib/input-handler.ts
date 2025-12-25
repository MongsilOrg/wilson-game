import { Grid } from './grid';
import { SelectedArea, GRID_WIDTH, GRID_HEIGHT } from '@/types/game';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private grid: Grid;
  private cellSize: number;
  private onSelectionComplete: (selectedPath: [number, number][]) => void;

  private isDragging: boolean = false;
  private startCell: [number, number] | null = null;
  private endCell: [number, number] | null = null;
  private selectedArea: SelectedArea | null = null;

  // 이벤트 리스너 핸들러 참조 저장
  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private mouseLeaveHandler: (e: MouseEvent) => void;
  private touchStartHandler: (e: TouchEvent) => void;
  private touchMoveHandler: (e: TouchEvent) => void;
  private touchEndHandler: (e: TouchEvent) => void;
  private touchCancelHandler: (e: TouchEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    grid: Grid,
    cellSize: number,
    onSelectionComplete: (selectedPath: [number, number][]) => void
  ) {
    this.canvas = canvas;
    this.grid = grid;
    this.cellSize = cellSize;
    this.onSelectionComplete = onSelectionComplete;

    // 핸들러를 인스턴스 메서드로 바인딩
    this.mouseDownHandler = (e) => this.handleStart(e);
    this.mouseMoveHandler = (e) => this.handleMove(e);
    this.mouseUpHandler = (e) => this.handleEnd(e);
    this.mouseLeaveHandler = (e) => this.handleEnd(e);
    this.touchStartHandler = (e) => {
      e.preventDefault();
      this.handleStart(e.touches[0]);
    };
    this.touchMoveHandler = (e) => {
      e.preventDefault();
      this.handleMove(e.touches[0]);
    };
    this.touchEndHandler = (e) => {
      e.preventDefault();
      this.handleEnd(e);
    };
    this.touchCancelHandler = (e) => {
      e.preventDefault();
      this.handleEnd(e);
    };

    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // 마우스 이벤트
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('mouseleave', this.mouseLeaveHandler);

    // 터치 이벤트
    this.canvas.addEventListener('touchstart', this.touchStartHandler);
    this.canvas.addEventListener('touchmove', this.touchMoveHandler);
    this.canvas.addEventListener('touchend', this.touchEndHandler);
    this.canvas.addEventListener('touchcancel', this.touchCancelHandler);
  }

  /**
   * 이벤트 리스너 정리
   */
  cleanup(): void {
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('mouseleave', this.mouseLeaveHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
    this.canvas.removeEventListener('touchend', this.touchEndHandler);
    this.canvas.removeEventListener('touchcancel', this.touchCancelHandler);
  }

  /**
   * 화면 좌표를 그리드 좌표로 변환
   */
  private screenToGrid(x: number, y: number): [number, number] | null {
    const rect = this.canvas.getBoundingClientRect();

    // 실제 렌더 크기 대비 내부 캔버스 좌표로 변환 (CSS 스케일 보정)
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const canvasX = (x - rect.left) * scaleX;
    const canvasY = (y - rect.top) * scaleY;

    const col = Math.floor(canvasX / this.cellSize);
    const row = Math.floor(canvasY / this.cellSize);

    if (this.grid.isValidPosition(row, col)) {
      return [row, col];
    }
    return null;
  }

  /**
   * 사각형 영역 내의 모든 셀 좌표 반환
   */
  private getCellsInArea(startRow: number, startCol: number, endRow: number, endCol: number): [number, number][] {
    const cells: [number, number][] = [];
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (this.grid.isValidPosition(row, col)) {
          cells.push([row, col]);
        }
      }
    }
    return cells;
  }

  /**
   * 드래그 시작
   */
  private handleStart(e: MouseEvent | Touch): void {
    const coord = this.screenToGrid(e.clientX, e.clientY);
    if (coord) {
      this.isDragging = true;
      this.startCell = coord;
      this.endCell = coord;
      this.updateSelectedArea();
    }
  }

  /**
   * 드래그 중
   */
  private handleMove(e: MouseEvent | Touch): void {
    if (!this.isDragging) return;

    const coord = this.screenToGrid(e.clientX, e.clientY);
    if (coord) {
      const [row, col] = coord;
      // Canvas 범위를 벗어나도 유효한 그리드 좌표로 제한
      const clampedRow = Math.max(0, Math.min(GRID_HEIGHT - 1, row));
      const clampedCol = Math.max(0, Math.min(GRID_WIDTH - 1, col));
      this.endCell = [clampedRow, clampedCol];
      this.updateSelectedArea();
    }
  }

  /**
   * 선택 영역 업데이트
   */
  private updateSelectedArea(): void {
    if (!this.startCell || !this.endCell) return;

    const [startRow, startCol] = this.startCell;
    const [endRow, endCol] = this.endCell;

    this.selectedArea = {
      startRow: Math.min(startRow, endRow),
      startCol: Math.min(startCol, endCol),
      endRow: Math.max(startRow, endRow),
      endCol: Math.max(startCol, endCol)
    };
  }

  /**
   * 드래그 종료
   */
  private handleEnd(e: MouseEvent | TouchEvent): void {
    if (this.isDragging && this.startCell && this.endCell) {
      // 선택된 영역 내의 모든 셀 가져오기
      const [startRow, startCol] = this.startCell;
      const [endRow, endCol] = this.endCell;
      const selectedCells = this.getCellsInArea(startRow, startCol, endRow, endCol);
      
      if (selectedCells.length > 0) {
        // 선택 완료 콜백 호출
        this.onSelectionComplete(selectedCells);
      }
      
      this.isDragging = false;
      this.startCell = null;
      this.endCell = null;
      this.selectedArea = null;
    }
  }

  /**
   * 현재 선택된 영역 가져오기
   */
  getSelectedArea(): SelectedArea | null {
    return this.selectedArea;
  }

  /**
   * 현재 선택된 셀들 가져오기
   */
  getSelectedCells(): [number, number][] {
    if (!this.selectedArea) return [];
    return this.getCellsInArea(
      this.selectedArea.startRow,
      this.selectedArea.startCol,
      this.selectedArea.endRow,
      this.selectedArea.endCol
    );
  }

  /**
   * 입력 상태 초기화
   */
  reset(): void {
    this.isDragging = false;
    this.startCell = null;
    this.endCell = null;
    this.selectedArea = null;
  }
}

