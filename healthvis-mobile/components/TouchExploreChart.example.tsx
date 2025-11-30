/**
 * TouchExploreChart Example
 * 
 * Demonstrates usage of the TouchExploreChart component with sample data
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { TouchExploreChart } from './TouchExploreChart';
import { DataPoint } from '../types';

/**
 * Generate sample heart rate data
 */
const generateHeartRateData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const baseDate = new Date('2024-01-01T08:00:00');
  
  // Generate 24 hours of data (hourly readings)
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(baseDate.getHours() + i);
    
    // Simulate heart rate with some variation
    let value = 70 + Math.sin(i / 4) * 15 + Math.random() * 10;
    value = Math.round(value);
    
    // Determine range based on value
    let range: 'normal' | 'warning' | 'danger';
    if (value < 60 || value > 100) {
      range = 'danger';
    } else if (value < 65 || value > 90) {
      range = 'warning';
    } else {
      range = 'normal';
    }
    
    data.push({ value, timestamp, range });
  }
  
  return data;
};

/**
 * Generate sample glucose data
 */
const generateGlucoseData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const baseDate = new Date('2024-01-01T08:00:00');
  
  // Generate 12 readings (every 2 hours)
  for (let i = 0; i < 12; i++) {
    const timestamp = new Date(baseDate);
    timestamp.setHours(baseDate.getHours() + i * 2);
    
    // Simulate glucose levels
    let value = 100 + Math.sin(i / 2) * 30 + Math.random() * 20;
    value = Math.round(value);
    
    // Determine range based on value
    let range: 'normal' | 'warning' | 'danger';
    if (value < 70 || value > 180) {
      range = 'danger';
    } else if (value < 80 || value > 140) {
      range = 'warning';
    } else {
      range = 'normal';
    }
    
    data.push({ value, timestamp, range });
  }
  
  return data;
};

/**
 * Generate sample steps data
 */
const generateStepsData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  const baseDate = new Date('2024-01-01T00:00:00');
  
  // Generate 7 days of data
  for (let i = 0; i < 7; i++) {
    const timestamp = new Date(baseDate);
    timestamp.setDate(baseDate.getDate() + i);
    
    // Simulate daily steps
    let value = 8000 + Math.random() * 4000;
    value = Math.round(value);
    
    // Determine range based on value
    let range: 'normal' | 'warning' | 'danger';
    if (value < 5000) {
      range = 'danger';
    } else if (value < 7000) {
      range = 'warning';
    } else {
      range = 'normal';
    }
    
    data.push({ value, timestamp, range });
  }
  
  return data;
};

/**
 * Example component demonstrating TouchExploreChart usage
 */
export const TouchExploreChartExample: React.FC = () => {
  const heartRateData = generateHeartRateData();
  const glucoseData = generateGlucoseData();
  const stepsData = generateStepsData();
  const emptyData: DataPoint[] = [];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>TouchExploreChart Examples</Text>
      
      <Text style={styles.sectionTitle}>Heart Rate (24 hours)</Text>
      <TouchExploreChart
        data={heartRateData}
        accessibilityLabel="Heart rate chart for the past 24 hours"
        accessibilityHint="Drag your finger across to explore hourly heart rate values"
        title="Heart Rate"
        unit="bpm"
      />

      <Text style={styles.sectionTitle}>Blood Glucose (12 readings)</Text>
      <TouchExploreChart
        data={glucoseData}
        accessibilityLabel="Blood glucose chart for the past day"
        accessibilityHint="Drag your finger across to explore glucose readings every 2 hours"
        title="Blood Glucose"
        unit="mg/dL"
      />

      <Text style={styles.sectionTitle}>Daily Steps (7 days)</Text>
      <TouchExploreChart
        data={stepsData}
        accessibilityLabel="Daily steps chart for the past week"
        accessibilityHint="Drag your finger across to explore daily step counts"
        title="Daily Steps"
        unit="steps"
      />

      <Text style={styles.sectionTitle}>Empty Chart (No Data)</Text>
      <TouchExploreChart
        data={emptyData}
        accessibilityLabel="Empty chart with no data"
        accessibilityHint="This chart has no data available"
        title="No Data Example"
      />

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>How to Use:</Text>
        <Text style={styles.instructionsText}>
          1. Touch the chart area to hear the nearest data point
        </Text>
        <Text style={styles.instructionsText}>
          2. Drag your finger horizontally to explore different points
        </Text>
        <Text style={styles.instructionsText}>
          3. Feel haptic feedback: light (normal), medium (warning), heavy (danger)
        </Text>
        <Text style={styles.instructionsText}>
          4. Lift your finger to hear the range you explored
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#000',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    color: '#333',
  },
  instructions: {
    marginTop: 32,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  instructionsText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
    lineHeight: 20,
  },
});

export default TouchExploreChartExample;
