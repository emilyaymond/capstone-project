import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { HealthMetric } from '@/types/health-metric';

interface TimeSliceRowProps {
  metric: HealthMetric;
  onFocus: () => void;
  accessibilityLabel: string;
}

export function TimeSliceRow({ metric, onFocus, accessibilityLabel }: TimeSliceRowProps) {
  const color = metric.range === 'danger' ? '#FF3B30' 
                   : metric.range === 'warning' ? '#FF9500' 
                   : '#34C759'; // Green for normal

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onFocus}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to hear tone for this time slice"
      activeOpacity={0.7}
    >
      <View style={styles.rowContent}>
        <ThemedText style={[styles.time, { color }]} lightColor={color}>
          {new Date(metric.timestamp).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}
        </ThemedText>
        <ThemedText style={[styles.value, { color }]} lightColor={color}>
          {metric.value} bpm
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { 
    padding: 12, 
    borderRadius: 10, 
    backgroundColor: 'rgba(255,255,255,0.7)', 
    marginHorizontal: 4,
    marginVertical: 2,
  },
  rowContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  time: { fontSize: 14, fontWeight: '600' },
  value: { fontSize: 18, fontWeight: '900' },
});
