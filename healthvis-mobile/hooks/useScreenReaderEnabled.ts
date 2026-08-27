import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Tracks whether a screen reader is currently active, updating if it toggles.
 *
 * Charts use this to decide whether to expose themselves as a single
 * "adjustable" node with swipe actions, rather than letting VoiceOver wander
 * through individual data points.
 */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (!cancelled) setEnabled(value);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setEnabled,
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return enabled;
}
