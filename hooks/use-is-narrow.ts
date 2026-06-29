"use client";

import { useCallback, useSyncExternalStore } from "react";

/** True when the viewport is narrow (mobile / small tablet). Backed by
 *  `matchMedia` via `useSyncExternalStore` so the SSR snapshot is stable and
 *  there is no hydration mismatch (server always renders the `false` snapshot). */
export function useIsNarrow(bp = 880): boolean {
  const query = `(max-width: ${bp - 1}px)`;

  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
