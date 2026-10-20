import { describe, it, expect, vi } from 'vitest';
import { InputHandler } from '@/lib/input-handler';
import { Grid } from '@/lib/grid';
import { GRID_WIDTH, GRID_HEIGHT } from '@/types/game';

const CELL = 10;

function setup() {
  const listeners = new Map<string, (e: unknown) => void>();
  const canvas = {
    width: GRID_WIDTH * CELL,
    height: GRID_HEIGHT * CELL,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: GRID_WIDTH * CELL, height: GRID_HEIGHT * CELL }),
    addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
  } as unknown as HTMLCanvasElement;
  const onSelect = vi.fn();
  const handler = new InputHandler(canvas, new Grid(), CELL, onSelect);
  const touch = (type: string, x?: number, y?: number) =>
    listeners.get(type)!({ preventDefault: () => {}, touches: x === undefined ? [] : [{ clientX: x, clientY: y }] });
  return { handler, onSelect, touch };
}

describe('InputHandler 드래그 좌표 제한', () => {
  it('Canvas 안에서 움직이면 그 칸까지 선택한다', () => {
    const { handler, touch } = setup();
    touch('touchstart', 5, 5);
    touch('touchmove', 35, 25);
    expect(handler.getSelectedArea()).toEqual({ startRow: 0, startCol: 0, endRow: 2, endCol: 3 });
  });

  it('Canvas 오른쪽 아래 밖으로 나가면 마지막 칸으로 제한한다', () => {
    const { handler, onSelect, touch } = setup();
    touch('touchstart', 105, 55);
    touch('touchmove', 500, 500);
    expect(handler.getSelectedArea()).toEqual({
      startRow: 5,
      startCol: 10,
      endRow: GRID_HEIGHT - 1,
      endCol: GRID_WIDTH - 1,
    });
    touch('touchend');
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0][0]).toHaveLength((GRID_HEIGHT - 5) * (GRID_WIDTH - 10));
  });

  it('Canvas 왼쪽 위 밖으로 나가면 0번 칸으로 제한한다', () => {
    const { handler, touch } = setup();
    touch('touchstart', 35, 25);
    touch('touchmove', -80, -80);
    expect(handler.getSelectedArea()).toEqual({ startRow: 0, startCol: 0, endRow: 2, endCol: 3 });
  });

  it('그리드 밖에서 시작한 드래그는 무시한다', () => {
    const { handler, onSelect, touch } = setup();
    touch('touchstart', -5, 5);
    touch('touchmove', 35, 25);
    touch('touchend');
    expect(handler.getSelectedArea()).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
