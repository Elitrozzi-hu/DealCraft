"use client";

import { useEffect, useState } from "react";

/** True when the viewport is narrow (mobile / small tablet). Ports the PoC
 *  `useIsNarrow` responsive hook. */
export function useIsNarrow(bp = 880): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < bp);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bp]);

  return narrow;
}
