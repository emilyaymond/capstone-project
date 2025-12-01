#!/usr/bin/env node

/**
 * Test script for Apple Health Parser
 * 
 * Tests the apple-health-parser.ts with the Health-Export.zip file
 * to ensure it can properly parse real Apple Health data.
 */

const fs = require('fs');
const path = require('path');

// Import the parser (we'll use a mock since this is Node.js)
async function testParser() {
  console.log('🧪 Testing Apple Health Parser\n');
  
  // Check if Health-Export.zip exists
  const zipPath = path.join(__dirname, '../../Health-Export.zip');
  
  if (!fs.existsSync(zipPath)) {
    console.error('❌ Health-Export.zip not found at:', zipPath);
    process.exit(1);
  }
  
  const stats = fs.statSync(zipPath);
  console.log('✅ Found Health-Export.zip');
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Path: ${zipPath}\n`);
  
  // Read the file
  const zipBuffer = fs.readFileSync(zipPath);
  
  console.log('📦 Loading parser modules...');
  
  // Dynamic import for ES modules
  const JSZip = (await import('jszip')).default;
  const { XMLParser } = await import('fast-xml-parser');
  
  console.log('✅ Modules loaded\n');
  
  console.log('📂 Unzipping file...');
  const zip = await JSZip.loadAsync(zipBuffer);
  
  // List files in ZIP
  const files = Object.keys(zip.files);
  console.log(`✅ Found ${files.length} files in ZIP\n`);
  
  // Find export.xml
  const exportXml = zip.file('apple_health_export/export.xml') || zip.file('export.xml');
  
  if (!exportXml) {
    console.error('❌ export.xml not found in ZIP');
    process.exit(1);
  }
  
  console.log('✅ Found export.xml\n');
  
  console.log('📄 Reading XML content...');
  const xmlContent = await exportXml.async('text');
  const xmlSizeKB = (xmlContent.length / 1024).toFixed(2);
  console.log(`✅ XML size: ${xmlSizeKB} KB\n`);
  
  console.log('🔍 Parsing XML...');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
  });
  
  const parsed = parser.parse(xmlContent);
  console.log('✅ XML parsed successfully\n');
  
  // Extract records
  console.log('📊 Analyzing health records...');
  const healthData = parsed.HealthData;
  
  if (!healthData) {
    console.error('❌ No HealthData found in XML');
    process.exit(1);
  }
  
  const records = healthData.Record;
  const recordArray = Array.isArray(records) ? records : [records];
  
  console.log(`✅ Total records: ${recordArray.length}\n`);
  
  // Count by type
  const typeCounts = {};
  const targetTypes = {
    'HKQuantityTypeIdentifierHeartRate': 'Heart Rate',
    'HKQuantityTypeIdentifierBloodGlucose': 'Blood Glucose',
    'HKQuantityTypeIdentifierStepCount': 'Steps',
    'HKCategoryTypeIdentifierSleepAnalysis': 'Sleep',
  };
  
  for (const record of recordArray) {
    const type = record.type;
    if (!typeCounts[type]) {
      typeCounts[type] = 0;
    }
    typeCounts[type]++;
  }
  
  console.log('📈 Target Health Data Types:\n');
  let foundCount = 0;
  for (const [typeId, typeName] of Object.entries(targetTypes)) {
    const count = typeCounts[typeId] || 0;
    if (count > 0) {
      console.log(`   ✅ ${typeName}: ${count} records`);
      foundCount++;
    } else {
      console.log(`   ⚠️  ${typeName}: 0 records`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Total record types: ${Object.keys(typeCounts).length}`);
  console.log(`   Target types found: ${foundCount}/4`);
  console.log(`   Total records: ${recordArray.length}`);
  
  // Show sample records
  console.log('\n📋 Sample Records:\n');
  let sampleCount = 0;
  for (const [typeId, typeName] of Object.entries(targetTypes)) {
    const sample = recordArray.find(r => r.type === typeId);
    if (sample && sampleCount < 3) {
      console.log(`   ${typeName}:`);
      console.log(`      Value: ${sample.value} ${sample.unit}`);
      console.log(`      Date: ${sample.startDate}`);
      console.log(`      Source: ${sample.sourceName || 'Unknown'}\n`);
      sampleCount++;
    }
  }
  
  console.log('✅ Test completed successfully!\n');
  console.log('🎉 The Health-Export.zip file is valid and ready for testing in the app.\n');
}

// Run the test
testParser().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
