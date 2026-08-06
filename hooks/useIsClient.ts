'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * 하이드레이션이 끝났는지 여부.
 * 서버와 첫 렌더에서 false, 그 뒤 true가 되어 서버에 없는 값을 안전하게 표시할 수 있다.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
