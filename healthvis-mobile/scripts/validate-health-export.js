#!/usr/bin/env node

/**
 * Validate Health-Export.zip structure
 * 
 * Checks that the ZIP file has the correct structure for Apple Health data
 * without loading the entire XML file into memory.
 */

const fs = require('fs');
const path = require('path');

async function validateExport() {
  console.log('🧪 Validating Health-Export.zip\n');
  
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
  
  console.log('📦 Loading JSZip...');
  const JSZip = (await import('jszip')).default;
  console.log('✅ JSZip loaded\n');
  
  console.log('📂 Unzipping file...');
  const zip = await JSZip.loadAsync(zipBuffer);
  
  // List files in ZIP
  const files = Object.keys(zip.files);
  console.log(`✅ Found ${files.length} files in ZIP\n`);
  
  // Check for export.xml
  const exportXml = zip.file('apple_health_export/export.xml') || zip.file('export.xml');
  
  if (!exportXml) {
    console.error('❌ export.xml not found in ZIP');
    process.exit(1);
  }
  
  console.log('✅ Found export.xml');
  
  // Get file info without loading content
  const xmlFile = zip.files['apple_health_export/export.xml'] || zip.files['export.xml'];
  console.log(`   Compressed size: ${(xmlFile._data.compressedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Uncompressed size: ${(xmlFile._data.uncompressedSize / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Check for workout routes
  const workoutRoutes = files.filter(f => f.includes('workout-routes'));
  console.log(`✅ Found ${workoutRoutes.length} workout route files\n`);
  
  // List some workout routes
  if (workoutRoutes.length > 0) {
    console.log('📍 Sample workout routes:');
    workoutRoutes.slice(0, 5).forEach(route => {
      console.log(`   - ${path.basename(route)}`);
    });
    if (workoutRoutes.length > 5) {
      console.log(`   ... and ${workoutRoutes.length - 5} more\n`);
    } else {
      console.log('');
    }
  }
  
  console.log('✅ Validation completed successfully!\n');
  console.log('📋 Summary:');
  console.log(`   ✓ ZIP file is valid`);
  console.log(`   ✓ Contains export.xml (${(xmlFile._data.uncompressedSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`   ✓ Contains ${workoutRoutes.length} workout routes`);
  console.log(`   ✓ Total files: ${files.length}\n`);
  console.log('🎉 The Health-Export.zip file is ready for testing in the app!\n');
  console.log('💡 Note: The XML file is very large. The app will parse it');
  console.log('   incrementally to avoid memory issues.\n');
}

// Run the validation
validateExport().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
