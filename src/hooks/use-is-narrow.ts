import { useCallback, useSyncExternalStore } from "react";

export function useIsNarrow(bp = 880): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(`(max-width: ${bp - 1}px)`);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [bp],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(`(max-width: ${bp - 1}px)`).matches,
    [bp],
  );
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
