#!/usr/bin/env node

/**
 * Create Sample Apple Health Export
 * 
 * Generates a small sample Apple Health export ZIP file for testing
 * without needing to load the full 740MB XML file.
 */

const fs = require('fs');
const path = require('path');

async function createSampleExport() {
  console.log('🏗️  Creating sample Apple Health export...\n');
  
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  // Generate sample health data
  const sampleData = generateSampleHealthData();
  
  // Create export.xml
  const xmlContent = createHealthXML(sampleData);
  
  // Add to ZIP
  zip.folder('apple_health_export');
  zip.file('apple_health_export/export.xml', xmlContent);
  
  console.log('✅ Generated sample health data');
  console.log(`   - ${sampleData.heartRate.length} heart rate records`);
  console.log(`   - ${sampleData.glucose.length} glucose records`);
  console.log(`   - ${sampleData.steps.length} step records`);
  console.log(`   - ${sampleData.sleep.length} sleep records\n`);
  
  // Generate ZIP
  console.log('📦 Creating ZIP file...');
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });
  
  // Save to file
  const outputPath = path.join(__dirname, '../../Health-Export-Sample.zip');
  fs.writeFileSync(outputPath, zipBuffer);
  
  const stats = fs.statSync(outputPath);
  console.log('✅ Sample export created!');
  console.log(`   Path: ${outputPath}`);
  console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);
  
  console.log('🎉 You can now test with Health-Export-Sample.zip\n');
}

function generateSampleHealthData() {
  const now = new Date();
  const data = {
    heartRate: [],
    glucose: [],
    steps: [],
    sleep: [],
  };
  
  // Generate 30 days of data
  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // Heart rate: 3 readings per day
    for (let i = 0; i < 3; i++) {
      const time = new Date(date);
      time.setHours(8 + i * 6, Math.random() * 60, 0);
      data.heartRate.push({
        value: 60 + Math.random() * 40, // 60-100 bpm
        date: time,
      });
    }
    
    // Glucose: 2 readings per day (if diabetic)
    if (day % 2 === 0) {
      for (let i = 0; i < 2; i++) {
        const time = new Date(date);
        time.setHours(8 + i * 8, Math.random() * 60, 0);
        data.glucose.push({
          value: 80 + Math.random() * 60, // 80-140 mg/dL
          date: time,
        });
      }
    }
    
    // Steps: 1 reading per day
    const stepsTime = new Date(date);
    stepsTime.setHours(23, 59, 0);
    data.steps.push({
      value: 5000 + Math.random() * 10000, // 5000-15000 steps
      date: stepsTime,
    });
    
    // Sleep: 1 reading per day
    const sleepTime = new Date(date);
    sleepTime.setHours(7, 0, 0);
    data.sleep.push({
      value: 6 + Math.random() * 3, // 6-9 hours
      date: sleepTime,
    });
  }
  
  return data;
}

function createHealthXML(data) {
  const records = [];
  
  // Heart rate records
  data.heartRate.forEach(record => {
    records.push(createRecord(
      'HKQuantityTypeIdentifierHeartRate',
      record.value.toFixed(0),
      'count/min',
      record.date
    ));
  });
  
  // Glucose records
  data.glucose.forEach(record => {
    records.push(createRecord(
      'HKQuantityTypeIdentifierBloodGlucose',
      record.value.toFixed(0),
      'mg/dL',
      record.date
    ));
  });
  
  // Steps records
  data.steps.forEach(record => {
    records.push(createRecord(
      'HKQuantityTypeIdentifierStepCount',
      record.value.toFixed(0),
      'count',
      record.date
    ));
  });
  
  // Sleep records
  data.sleep.forEach(record => {
    records.push(createRecord(
      'HKCategoryTypeIdentifierSleepAnalysis',
      record.value.toFixed(1),
      'hr',
      record.date
    ));
  });
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!ELEMENT HealthData (ExportDate,Me,Record*)>
<!ELEMENT ExportDate (#PCDATA)>
<!ELEMENT Me EMPTY>
<!ELEMENT Record EMPTY>
]>
<HealthData locale="en_US">
  <ExportDate value="${new Date().toISOString()}"/>
  <Me HKCharacteristicTypeIdentifierDateOfBirth="1990-01-01" 
      HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexMale" 
      HKCharacteristicTypeIdentifierBloodType="HKBloodTypeNotSet"/>
${records.join('\n')}
</HealthData>`;
}

function createRecord(type, value, unit, date) {
  const dateStr = date.toISOString().replace('T', ' ').substring(0, 19);
  return `  <Record type="${type}" sourceName="HealthVis Test" value="${value}" unit="${unit}" startDate="${dateStr}" endDate="${dateStr}"/>`;
}

// Run the generator
createSampleExport().catch(error => {
  console.error('❌ Failed to create sample export:', error);
  process.exit(1);
});
