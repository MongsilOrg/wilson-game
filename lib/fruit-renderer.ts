import { SelectedArea } from '@/types/game';
import { BoardPalette } from '@/lib/board-palette';

export class FruitRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number;
  private palette: BoardPalette;
  private wilsonImages: Map<number, HTMLImageElement>;
  private imageSizes: Map<number, { width: number; height: number }>;
  private gridWidth: number;
  private gridHeight: number;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, cellSize: number, palette: BoardPalette, gridWidth: number = 17, gridHeight: number = 10) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.cellSize = cellSize;
    this.palette = palette;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.wilsonImages = new Map();
    this.imageSizes = new Map();

    // 1부터 9까지의 윌슨 이미지 미리 로드
    for (let i = 1; i <= 9; i++) {
      const img = new Image();
      img.onload = () => {
        this.imageSizes.set(i, {
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.src = `/wilson/number_${i}.png`;
      this.wilsonImages.set(i, img);
    }
  }

  /**
   * 윌슨 이미지 그리기
   */
  drawFruit(col: number, row: number, value: number, isSelected: boolean = false, alpha: number = 1.0): void {
    if (value === 0 || value === null || value < 1 || value > 9) return;

    const cellX = col * this.cellSize;
    const cellY = row * this.cellSize;
    const x = cellX + this.cellSize / 2;
    const y = cellY + this.cellSize / 2;
    // 가로/세로 중 작은 값을 써서 항상 정사각형을 유지한다.
    const renderSize = Math.min(
      this.canvas.width / this.gridWidth,
      this.canvas.height / this.gridHeight
    );
    const renderHalfSize = renderSize / 2;

    const wilsonImage = this.wilsonImages.get(value);
    if (!wilsonImage) return;

    const sizeInfo = this.imageSizes.get(value);
    const iw = sizeInfo?.width || wilsonImage.naturalWidth || wilsonImage.width || 0;
    const ih = sizeInfo?.height || wilsonImage.naturalHeight || wilsonImage.height || 0;
    if (iw <= 0 || ih <= 0) return;

    // 원본 이미지에서 중앙 정사각형 영역만 사용
    const srcSize = Math.min(iw, ih);
    const sx = (iw - srcSize) / 2;
    const sy = (ih - srcSize) / 2;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // 선택 하이라이트는 클리핑 밖에서 그려야 잘리지 않는다.
    if (isSelected) {
      this.ctx.save();
      this.ctx.shadowColor = this.palette.selectedGlow;
      this.ctx.shadowBlur = 15;
      this.ctx.strokeStyle = this.palette.selectedRing;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, renderHalfSize - 1, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 윌슨 이미지는 흰 사각형 배경을 포함한다. 원형으로 잘라내지 않으면
    // 다크 테마에서 판 전체가 흰 타일로 덮인다.
    this.ctx.beginPath();
    this.ctx.arc(x, y, renderHalfSize, 0, Math.PI * 2);
    this.ctx.clip();

    this.ctx.drawImage(
      wilsonImage,
      sx,
      sy,
      srcSize,
      srcSize,
      x - renderHalfSize,
      y - renderHalfSize,
      renderSize,
      renderSize
    );

    this.ctx.restore();
  }

  /**
   * 선택 영역 그리기 (사각형 하이라이트)
   */
  drawSelectionArea(area: SelectedArea, cellSize: number): void {
    if (!area) return;

    const { startRow, startCol, endRow, endCol } = area;
    const x = startCol * cellSize;
    const y = startRow * cellSize;
    const width = (endCol - startCol + 1) * cellSize;
    const height = (endRow - startRow + 1) * cellSize;

    this.ctx.save();

    this.ctx.fillStyle = this.palette.selectionFill;
    this.ctx.fillRect(x, y, width, height);

    // 테두리
    this.ctx.strokeStyle = this.palette.selectionStroke;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = this.palette.selectionGlow;
    this.ctx.shadowBlur = 10;
    this.ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

    this.ctx.restore();
  }

  /**
   * 그리드 배경 그리기
   */
  drawGrid(gridWidth: number = 17, gridHeight: number = 10): void {
    this.ctx.fillStyle = this.palette.surface;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 그리드 라인 그리기
    this.ctx.strokeStyle = this.palette.gridLine;
    this.ctx.lineWidth = 1;

    for (let row = 0; row <= gridHeight; row++) {
      const y = row * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    for (let col = 0; col <= gridWidth; col++) {
      const x = col * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
  }

  /**
   * 빈 셀 배경 그리기
   */
  drawCellBackground(col: number, row: number): void {
    const cellX = col * this.cellSize;
    const cellY = row * this.cellSize;
    
    this.ctx.save();
    this.ctx.fillStyle = this.palette.surface;
    this.ctx.fillRect(cellX, cellY, this.cellSize, this.cellSize);
    this.ctx.restore();
  }

  /**
   * 선택 영역 합계 오버레이 (사용 안 함 - 기능 제거)
   */
  drawSumOverlay(_area: SelectedArea, _sum: number, _cellSize: number): void {
    // 합계 오버레이 기능 제거
  }
}

