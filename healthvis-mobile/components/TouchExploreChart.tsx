/**
 * TouchExploreChart Component
 * 
 * Interactive chart component that allows users to explore data through touch gestures.
 * Announces data values as users drag their finger across the chart.
 * Provides haptic feedback based on data range (normal/warning/danger).
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.4
 */

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  LayoutChangeEvent,
  Text,
} from 'react-native';
import { DataPoint } from '../types';
import { useHaptics } from '../hooks/useHaptics';
import { announce } from '../lib/announcer';

// ============================================================================
// Component Props Interface
// ============================================================================

export interface TouchExploreChartProps {
  /** Array of data points to display and explore */
  data: DataPoint[];
  /** Accessibility label describing the chart */
  accessibilityLabel: string;
  /** Accessibility hint explaining how to interact */
  accessibilityHint: string;
  /** Optional title for the chart */
  title?: string;
  /** Optional unit label (e.g., "bpm", "mg/dL") */
  unit?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates the nearest data point to a given x position
 * Uses linear interpolation based on chart width
 * 
 * Requirement 6.1: Calculate nearest data point to touch position
 * 
 * @param x - Touch x coordinate
 * @param chartWidth - Width of the chart area
 * @param data - Array of data points
 * @returns The nearest data point or null if no data
 */
const calculateNearestPoint = (
  x: number,
  chartWidth: number,
  data: DataPoint[]
): DataPoint | null => {
  if (!data || data.length === 0) {
    return null;
  }

  if (data.length === 1) {
    return data[0];
  }

  // Calculate the index based on x position
  // Map x position (0 to chartWidth) to data index (0 to data.length - 1)
  const normalizedX = Math.max(0, Math.min(x, chartWidth));
  const index = Math.round((normalizedX / chartWidth) * (data.length - 1));
  
  return data[index];
};

/**
 * Formats a data point for announcement
 * 
 * @param point - Data point to format
 * @param unit - Optional unit label
 * @returns Formatted string for announcement
 */
const formatDataPointAnnouncement = (
  point: DataPoint,
  unit?: string
): string => {
  const date = new Date(point.timestamp);
  const timeString = date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const dateString = date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric' 
  });
  
  const unitStr = unit ? ` ${unit}` : '';
  const rangeStr = point.range !== 'normal' ? `, ${point.range}` : '';
  
  return `${point.value}${unitStr}${rangeStr}, ${timeString}, ${dateString}`;
};

// ============================================================================
// TouchExploreChart Component
// ============================================================================

export const TouchExploreChart: React.FC<TouchExploreChartProps> = ({
  data,
  accessibilityLabel,
  accessibilityHint,
  title,
  unit,
}) => {
  const { triggerForDataPoint } = useHaptics();
  
  // Track chart dimensions
  const [chartWidth, setChartWidth] = useState<number>(0);
  
  // Track the last announced point to prevent duplicate announcements
  const lastAnnouncedIndexRef = useRef<number | null>(null);
  
  // Track the range of values explored during a drag
  const exploredValuesRef = useRef<number[]>([]);
  
  // Track announcement timing to ensure 50ms response time
  const lastAnnouncementTimeRef = useRef<number>(0);
  
  // Queue for managing announcements during continuous drag
  const announcementQueueRef = useRef<number | null>(null);

  // ============================================================================
  // Layout Handler
  // ============================================================================

  /**
   * Handles layout changes to track chart dimensions
   */
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setChartWidth(width);
  }, []);

  // ============================================================================
  // Announcement Handler
  // ============================================================================

  /**
   * Announces a data point with timing control and queue management
   * Ensures announcements happen within 50ms and don't overlap
   * 
   * Requirements 6.2, 6.3: Announce within 50ms, prevent overlaps
   * 
   * @param point - Data point to announce
   */
  const announceDataPoint = useCallback((point: DataPoint) => {
    const now = Date.now();
    const timeSinceLastAnnouncement = now - lastAnnouncementTimeRef.current;
    
    // Clear any pending announcement
    if (announcementQueueRef.current) {
      clearTimeout(announcementQueueRef.current);
      announcementQueueRef.current = null;
    }
    
    // If enough time has passed, announce immediately
    if (timeSinceLastAnnouncement >= 50) {
      const message = formatDataPointAnnouncement(point, unit);
      announce(message, { priority: 'polite' });
      lastAnnouncementTimeRef.current = now;
    } else {
      // Queue the announcement to prevent overlap
      const delay = 50 - timeSinceLastAnnouncement;
      announcementQueueRef.current = setTimeout(() => {
        const message = formatDataPointAnnouncement(point, unit);
        announce(message, { priority: 'polite' });
        lastAnnouncementTimeRef.current = Date.now();
        announcementQueueRef.current = null;
      }, delay);
    }
  }, [unit]);

  // ============================================================================
  // Touch Handlers
  // ============================================================================

  /**
   * Handles touch movement across the chart
   * Calculates nearest point, announces it, and triggers haptic feedback
   * 
   * Requirements 6.1, 6.2, 6.3, 6.5: Touch-to-explore with feedback
   */
  const handleTouchMove = useCallback((x: number) => {
    // Handle empty data case (Requirement 6.6)
    if (!data || data.length === 0) {
      if (lastAnnouncedIndexRef.current !== -1) {
        announce('No data available', { priority: 'polite' });
        lastAnnouncedIndexRef.current = -1;
      }
      return;
    }

    // Calculate nearest point
    const nearestPoint = calculateNearestPoint(x, chartWidth, data);
    
    if (!nearestPoint) {
      return;
    }

    // Find the index of this point
    const pointIndex = data.indexOf(nearestPoint);
    
    // Only announce if this is a different point than last time
    if (pointIndex !== lastAnnouncedIndexRef.current) {
      // Announce the data point (Requirement 6.2)
      announceDataPoint(nearestPoint);
      
      // Trigger haptic feedback based on range (Requirement 6.5)
      triggerForDataPoint(nearestPoint.range);
      
      // Track this point for range calculation
      exploredValuesRef.current.push(nearestPoint.value);
      
      // Update last announced index
      lastAnnouncedIndexRef.current = pointIndex;
    }
  }, [data, chartWidth, announceDataPoint, triggerForDataPoint]);

  /**
   * Handles gesture end (finger lift)
   * Announces the total range explored
   * 
   * Requirement 6.4: Announce range on gesture end
   */
  const handleTouchEnd = useCallback(() => {
    // Clear any pending announcements
    if (announcementQueueRef.current) {
      clearTimeout(announcementQueueRef.current);
      announcementQueueRef.current = null;
    }

    // Announce range if we explored any values
    if (exploredValuesRef.current.length > 0) {
      const min = Math.min(...exploredValuesRef.current);
      const max = Math.max(...exploredValuesRef.current);
      const unitStr = unit ? ` ${unit}` : '';
      
      if (min === max) {
        announce(`Explored value: ${min}${unitStr}`, { priority: 'polite' });
      } else {
        announce(
          `Explored range: ${min}${unitStr} to ${max}${unitStr}`,
          { priority: 'polite' }
        );
      }
    }

    // Reset tracking
    lastAnnouncedIndexRef.current = null;
    exploredValuesRef.current = [];
  }, [unit]);

  // ============================================================================
  // PanResponder Setup
  // ============================================================================

  /**
   * PanResponder for handling touch gestures
   * Captures horizontal drag gestures and announces data points
   */
  const panResponder = useRef(
    PanResponder.create({
      // Request to be the responder
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      // Handle touch start
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX } = evt.nativeEvent;
        handleTouchMove(locationX);
      },

      // Handle touch move
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX } = evt.nativeEvent;
        handleTouchMove(locationX);
      },

      // Handle touch end
      onPanResponderRelease: () => {
        handleTouchEnd();
      },

      // Handle touch cancel
      onPanResponderTerminate: () => {
        handleTouchEnd();
      },
    })
  ).current;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="adjustable"
    >
      {title && (
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      )}
      
      <View
        style={styles.chartArea}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        {data.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No data available</Text>
            <Text style={styles.emptyHint}>
              Upload or sync data to explore
            </Text>
          </View>
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.instructionText}>
              Drag your finger across this area to explore data points
            </Text>
            <Text style={styles.dataCountText}>
              {data.length} data point{data.length !== 1 ? 's' : ''} available
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  chartArea: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  dataCountText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default TouchExploreChart;
