/**
 * 캔버스는 CSS를 못 쓰므로 테마 토큰을 읽어 색을 직접 넘겨준다.
 * 이게 없으면 다크 모드에서 게임판만 흰 채로 남는다.
 */
export interface BoardPalette {
  surface: string;
  gridLine: string;
  selectionFill: string;
  selectionStroke: string;
  selectionGlow: string;
  selectedRing: string;
  selectedGlow: string;
}

/** `210 25% 98%` 형태의 토큰을 캔버스가 확실히 파싱하는 쉼표 표기로 바꾼다. */
function toColor(token: string, alpha = 1): string {
  const [h, s, l] = token.trim().split(/\s+/);
  if (!h || !s || !l) return alpha < 1 ? 'rgba(0,0,0,0)' : '#ffffff';
  return alpha < 1 ? `hsla(${h}, ${s}, ${l}, ${alpha})` : `hsl(${h}, ${s}, ${l})`;
}

export function readBoardPalette(): BoardPalette {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(name);
  const isDark = document.documentElement.classList.contains('dark');

  return {
    surface: toColor(token('--card')),
    gridLine: toColor(token('--border'), isDark ? 0.55 : 0.8),
    // 선택 영역은 두 테마 모두에서 판 위에 떠 보여야 해서 강조색을 그대로 쓴다.
    selectionFill: toColor(token('--primary'), isDark ? 0.28 : 0.16),
    selectionStroke: toColor(token('--primary'), 0.95),
    selectionGlow: toColor(token('--primary'), 0.5),
    selectedRing: toColor(token('--primary'), 0.9),
    selectedGlow: toColor(token('--primary'), 0.7),
  };
}
