#!/usr/bin/env node

/**
 * Integration test for Apple Health Parser
 * 
 
const handleUploadError = useCallback(error: Error) => {
  console.error('X Upload failed:', error);
  }, []);

upload.tsx (57:18)

return { file: blob, filename: asset.name };
} catch (error) {
 console.error('Error reading file on native platform:', error);
 
 throw new Error('Failed to read file. Please try again.');
 
 }
}

FilePicker.tsx (137:20)

and one more console error FilePicker.tsx (288:20)

 * Tests the parser with the sample export to ensure it works correctly.
 */

const fs = require('fs');
const path = require('path');

async function testParser() {
  console.log('🧪 Testing Apple Health Parser Integration\n');
  
  // Test with sample file
  const samplePath = path.join(__dirname, '../../Health-Export-Sample.zip');
  
  if (!fs.existsSync(samplePath)) {
    console.error('❌ Sample file not found. Run create-sample-export.js first.');
    process.exit(1);
  }
  
  console.log('📦 Loading modules...');
  const JSZip = (await import('jszip')).default;
  const { XMLParser } = await import('fast-xml-parser');
  console.log('✅ Modules loaded\n');
  
  // Read and parse the sample file
  console.log('📂 Reading Health-Export-Sample.zip...');
  const zipBuffer = fs.readFileSync(samplePath);
  const zip = await JSZip.loadAsync(zipBuffer);
  
  const exportXml = zip.file('apple_health_export/export.xml');
  if (!exportXml) {
    console.error('❌ export.xml not found');
    process.exit(1);
  }
  
  console.log('✅ Found export.xml\n');
  
  console.log('📄 Parsing XML...');
  const xmlContent = await exportXml.async('text');
  
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
  });
  
  const parsed = parser.parse(xmlContent);
  console.log('✅ XML parsed\n');
  
  // Extract and count records
  const healthData = parsed.HealthData;
  const records = Array.isArray(healthData.Record) 
    ? healthData.Record 
    : [healthData.Record];
  
  console.log('📊 Analyzing records...\n');
  
  const typeCounts = {
    'HKQuantityTypeIdentifierHeartRate': 0,
    'HKQuantityTypeIdentifierBloodGlucose': 0,
    'HKQuantityTypeIdentifierStepCount': 0,
    'HKCategoryTypeIdentifierSleepAnalysis': 0,
  };
  
  const typeNames = {
    'HKQuantityTypeIdentifierHeartRate': 'Heart Rate',
    'HKQuantityTypeIdentifierBloodGlucose': 'Blood Glucose',
    'HKQuantityTypeIdentifierStepCount': 'Steps',
    'HKCategoryTypeIdentifierSleepAnalysis': 'Sleep',
  };
  
  records.forEach(record => {
    if (typeCounts.hasOwnProperty(record.type)) {
      typeCounts[record.type]++;
    }
  });
  
  console.log('✅ Results:\n');
  let totalTarget = 0;
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`   ${typeNames[type]}: ${count} records`);
    totalTarget += count;
  });
  
  console.log(`\n   Total target records: ${totalTarget}`);
  console.log(`   Total all records: ${records.length}\n`);
  
  // Show sample data
  console.log('📋 Sample Records:\n');
  Object.entries(typeNames).forEach(([type, name]) => {
    const sample = records.find(r => r.type === type);
    if (sample) {
      console.log(`   ${name}:`);
      console.log(`      Value: ${sample.value} ${sample.unit}`);
      console.log(`      Date: ${sample.startDate}`);
      console.log(`      Source: ${sample.sourceName}\n`);
    }
  });
  
  // Verify expected counts
  const expectedCounts = {
    'HKQuantityTypeIdentifierHeartRate': 90,
    'HKQuantityTypeIdentifierBloodGlucose': 30,
    'HKQuantityTypeIdentifierStepCount': 30,
    'HKCategoryTypeIdentifierSleepAnalysis': 30,
  };
  
  console.log('✅ Validation:\n');
  let allPassed = true;
  Object.entries(expectedCounts).forEach(([type, expected]) => {
    const actual = typeCounts[type];
    const passed = actual === expected;
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${typeNames[type]}: ${actual}/${expected}`);
    if (!passed) allPassed = false;
  });
  
  console.log('');
  
  if (allPassed) {
    console.log('🎉 All tests passed!\n');
    console.log('✅ The parser correctly extracts all health data types.');
    console.log('✅ Ready to test in the mobile app.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the parser logic.\n');
    process.exit(1);
  }
}

// Run the test
testParser().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
