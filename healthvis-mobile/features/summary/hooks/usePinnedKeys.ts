// healthvis-mobile/features/summary/hooks/usePinnedKeys.ts
import { useEffect, useState } from "react";
import { loadPinnedKeys, PinnedKey } from "@/lib/pins";

export function usePinnedKeys() {
  const [pins, setPins] = useState<PinnedKey[]>([]);
  const [isLoadingPins, setIsLoadingPins] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const keys = await loadPinnedKeys();
        if (mounted) setPins(keys);
      } finally {
        if (mounted) setIsLoadingPins(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { pins, isLoadingPins, setPins };
}
