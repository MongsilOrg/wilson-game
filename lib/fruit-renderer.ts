import { SelectedArea } from '@/types/game';

export class FruitRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number;
  private wilsonImage: HTMLImageElement;
  private imageWidth: number;
  private imageHeight: number;
  private gridWidth: number;
  private gridHeight: number;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, cellSize: number, gridWidth: number = 17, gridHeight: number = 10) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.cellSize = cellSize;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.wilsonImage = new Image();
    this.imageWidth = 0;
    this.imageHeight = 0;

    // 이미지 로드 완료 시 크기 저장
    this.wilsonImage.onload = () => {
      this.imageWidth = this.wilsonImage.naturalWidth;
      this.imageHeight = this.wilsonImage.naturalHeight;
    };

    this.wilsonImage.src = '/wilson.png';
  }

  /**
   * 윌슨 이미지 그리기
   */
  drawFruit(col: number, row: number, value: number, isSelected: boolean = false, alpha: number = 1.0): void {
    if (value === 0 || value === null) return;

    const cellX = col * this.cellSize;
    const cellY = row * this.cellSize;
    const x = cellX + this.cellSize / 2;
    const y = cellY + this.cellSize / 2;
    const size = this.cellSize; // 셀 크기 기준 정사각형 영역 (항상 1:1)
    const halfSize = size / 2;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // 셀 경계로 클리핑 (넘어가는 부분 자르기)
    this.ctx.beginPath();
    this.ctx.rect(cellX, cellY, this.cellSize, this.cellSize);
    this.ctx.clip();

    // 선택된 윌슨은 하이라이트
    if (isSelected) {
      this.ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
      this.ctx.shadowBlur = 15;
      
      // 선택된 경우 테두리 그리기
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, halfSize + 2, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // 윌슨 이미지 그리기 (항상 1:1 정사각형 비율 유지)
    const iw = this.imageWidth || this.wilsonImage.naturalWidth || this.wilsonImage.width;
    const ih = this.imageHeight || this.wilsonImage.naturalHeight || this.wilsonImage.height;

    if (iw > 0 && ih > 0) {
      // 원본 이미지에서 중앙 정사각형 영역만 사용 (더 짧은 변 기준)
      const srcSize = Math.min(iw, ih);
      const sx = (iw - srcSize) / 2;
      const sy = (ih - srcSize) / 2;

      // 실제 셀 크기 계산 (가로/세로 중 작은 값 사용하여 정사각형 보장)
      // 캔버스의 실제 크기와 그리드 크기를 고려
      const actualCellWidth = this.canvas.width / this.gridWidth;
      const actualCellHeight = this.canvas.height / this.gridHeight;
      // 더 작은 값을 사용하여 항상 정사각형 보장
      const renderSize = Math.min(actualCellWidth, actualCellHeight);
      const renderHalfSize = renderSize / 2;

      // drawImage: (image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      // 소스와 대상 모두 정사각형으로 설정하여 1:1 비율 보장
      this.ctx.drawImage(
        this.wilsonImage,
        sx,           // 소스 x (정사각형 영역의 시작)
        sy,           // 소스 y (정사각형 영역의 시작)
        srcSize,      // 소스 너비 (정사각형)
        srcSize,      // 소스 높이 (정사각형)
        x - renderHalfSize,  // 대상 x (중앙 정렬)
        y - renderHalfSize,  // 대상 y (중앙 정렬)
        renderSize,   // 대상 너비 (정사각형)
        renderSize    // 대상 높이 (정사각형)
      );
    }

    // 숫자 텍스트 (이미지 위에 표시)
    this.ctx.fillStyle = '#000000';
    this.ctx.font = `bold ${this.cellSize * 0.3}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(value.toString(), x, y);

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

    // 반투명 배경 (라이트/다크 모두에서 자연스럽게 보이는 옅은 노란색)
    this.ctx.fillStyle = 'rgba(234, 179, 8, 0.18)'; // amber-400 비슷한 톤
    this.ctx.fillRect(x, y, width, height);

    // 테두리
    this.ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)'; // amber-300/400
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = 'rgba(250, 204, 21, 0.6)';
    this.ctx.shadowBlur = 10;
    this.ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);

    this.ctx.restore();
  }

  /**
   * 그리드 배경 그리기
   */
  drawGrid(gridWidth: number = 17, gridHeight: number = 10): void {
    // 전체 배경색 채우기 (흰색)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 그리드 라인 그리기
    this.ctx.strokeStyle = '#E0E0E0';
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
    this.ctx.fillStyle = '#FFFFFF';
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

