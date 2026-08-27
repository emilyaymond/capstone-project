/**
 * Chart scrubbing
 *
 * Shared drag-to-explore plumbing for the scatter charts: which point is under
 * the finger, whether a drag is in progress, and firing one haptic per newly
 * selected point.
 *
 * The hourly and bucketed charts each carried their own verbatim copy of this,
 * which is how their haptic vocabularies drifted apart -- a "warning" point
 * buzzed medium on the day view and light on the week view, so the meaning a
 * blind user learns from one range did not hold in another.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { runOnJS, useAnimatedReaction } from "react-native-reanimated";

import { useHaptics } from "@/hooks/useHaptics";
import { useScreenReaderEnabled } from "@/hooks/useScreenReaderEnabled";
import type { DataRange } from "@/types";

/** Minimal shape of the press state victory-native's useChartPressState returns. */
export interface ChartPressState {
  state: { matchedIndex: { value: number } };
  isActive: boolean;
}

export interface ChartScrubbing {
  /** Index under the finger, or -1 when not scrubbing. */
  activeIndex: number;
  /** True while a drag is in progress. */
  isPressed: boolean;
  /** Whether a screen reader is active, for adjustable-node behaviour. */
  voiceOverOn: boolean;
  /**
   * Selects an item explicitly and plays its severity haptic.
   *
   * Used by the VoiceOver increment/decrement actions, which step through
   * points without a drag. Bypasses the repeat check so a deliberate step
   * always confirms itself.
   */
  selectIndex: (index: number) => void;
}

/**
 * Wires a chart's press state to selection state and severity haptics.
 *
 * @param press - Result of useChartPressState from the chart component
 * @param itemCount - Number of plotted items, used to bound the index
 * @param severityForIndex - Clinical severity of the item at an index
 */
export function useChartScrubbing(
  press: ChartPressState,
  itemCount: number,
  severityForIndex: (index: number) => DataRange,
): ChartScrubbing {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPressed, setIsPressed] = useState(false);
  const lastHapticIndexRef = useRef<number | null>(null);
  const haptics = useHaptics();
  const voiceOverOn = useScreenReaderEnabled();

  // One haptic per newly selected item, so holding still stays quiet.
  const playSeverityHaptic = useCallback(
    (index: number) => {
      switch (severityForIndex(index)) {
        case "danger":
          haptics.triggerHeavy();
          break;
        case "warning":
          haptics.triggerMedium();
          break;
        default:
          haptics.triggerSoft();
      }
    },
    [severityForIndex, haptics],
  );

  const triggerHaptic = useCallback(
    (index: number) => {
      if (index < 0 || index >= itemCount) return;
      if (lastHapticIndexRef.current === index) return;
      lastHapticIndexRef.current = index;
      playSeverityHaptic(index);
    },
    [itemCount, playSeverityHaptic],
  );

  const selectIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= itemCount) return;
      setActiveIndex(index);
      lastHapticIndexRef.current = index;
      playSeverityHaptic(index);
    },
    [itemCount, playSeverityHaptic],
  );

  const updateActiveIndex = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const updatePressed = useCallback((pressed: boolean) => {
    setIsPressed(pressed);
    if (!pressed) {
      setActiveIndex(-1);
      lastHapticIndexRef.current = null;
    }
  }, []);

  useAnimatedReaction(
    () => ({
      index: press.state.matchedIndex.value,
      active: press.isActive,
    }),
    (current, previous) => {
      if (!current.active) return;
      const currentIndex = current.index;
      const previousIndex = previous?.index ?? -1;

      if (currentIndex >= 0 && currentIndex !== previousIndex) {
        runOnJS(updateActiveIndex)(currentIndex);
        runOnJS(triggerHaptic)(currentIndex);
      }
    },
  );

  useEffect(() => {
    updatePressed(press.isActive);
  }, [press.isActive, updatePressed]);

  return { activeIndex, isPressed, voiceOverOn, selectIndex };
}
