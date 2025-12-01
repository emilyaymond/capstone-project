# Quick Start: Testing Apple Health Import

This guide gets you testing the Apple Health import feature in under 5 minutes.

## Prerequisites

- Node.js installed
- Expo CLI installed (`npm install -g expo-cli`)
- iOS Simulator, Android Emulator, or Expo Go app on your device

## Step 1: Validate Test Data (30 seconds)

```bash
cd HealthVis
node healthvis-mobile/scripts/validate-health-export.js
```

You should see:
```
✅ Found Health-Export.zip
✅ Contains export.xml (740.05 MB)
✅ Contains 61 workout routes
```

## Step 2: Create Sample Test File (10 seconds)

```bash
node healthvis-mobile/scripts/create-sample-export.js
```

This creates a small 3KB test file: `Health-Export-Sample.zip`

## Step 3: Test the Parser (10 seconds)

```bash
node healthvis-mobile/scripts/test-parser-integration.js
```

You should see:
```
🎉 All tests passed!
✅ The parser correctly extracts all health data types.
```

## Step 4: Start the App (1 minute)

```bash
cd healthvis-mobile
npm install  # if you haven't already
npm start
```

Choose your platform:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Press `w` for Web
- Scan QR code with Expo Go app

## Step 5: Test File Upload (1 minute)

1. In the app, tap the **Upload** tab
2. Tap **Select File**
3. Choose `Health-Export-Sample.zip`
4. Wait for processing (should be instant with the sample file)
5. See the success message with record counts

## Step 6: Verify Data Display (30 seconds)

1. Tap the **Home** tab
2. You should see:
   - Heart rate data in the vital signs card
   - Blood glucose readings
   - Step counts
   - Sleep data
   - Charts populated with the data

## Expected Results

### Upload Screen
```
✅ Upload Successful!
File: Health-Export-Sample.zip
Status: success
Analysis: Parsed 180 health records: 90 heart rate, 30 glucose, 30 steps, 30 sleep records.
```

### Home Screen
- Vital signs cards show recent values
- Charts display 30 days of data
- Date range: Last 30 days

## Testing with Real Data

Once the sample file works, test with the real export:

1. Transfer `Health-Export.zip` to your test device
   - iOS: Use AirDrop or Files app
   - Android: Use Google Drive or file manager
   - Web: Just select the file from your computer

2. Upload in the app (may take 10-30 seconds due to size)

3. Verify thousands of records are processed

## Troubleshooting

### "Connection Error" Message

**This is normal if the backend isn't running!**

Apple Health ZIP files are processed **locally** and don't need the backend. The error might appear from:
- A previous upload attempt
- The app checking backend health
- Trying to upload CSV/JSON files (which do need the backend)

**Solution:** Just upload the ZIP file anyway - it will work! Or start the backend:
```bash
cd backend
python main.py
```

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed help.

### App won't start
```bash
cd healthvis-mobile
npm install
npx expo start --clear
```

### File picker doesn't show ZIP files
- Make sure the file has a `.zip` extension
- Try renaming to ensure it's lowercase: `health-export-sample.zip`

### Parsing fails
- Check console logs in the terminal
- Verify the ZIP file with: `node scripts/validate-health-export.js`

### No data displays after upload
- Check the Home screen refresh
- Look for errors in the console
- Verify the date range of the data

### More Help
See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for comprehensive troubleshooting.

## Next Steps

- Read [TESTING_APPLE_HEALTH.md](healthvis-mobile/TESTING_APPLE_HEALTH.md) for detailed testing
- Review [APPLE_HEALTH_IMPORT.md](healthvis-mobile/APPLE_HEALTH_IMPORT.md) for feature docs
- Run component tests: `cd healthvis-mobile && npm test`
- Test accessibility features (screen reader, font scaling)

## Quick Commands Reference

```bash
# Validate real export
node healthvis-mobile/scripts/validate-health-export.js

# Create sample export
node healthvis-mobile/scripts/create-sample-export.js

# Test parser
node healthvis-mobile/scripts/test-parser-integration.js

# Start app
cd healthvis-mobile && npm start

# Run tests
cd healthvis-mobile && npm test

# Clear cache and restart
cd healthvis-mobile && npx expo start --clear
```

## Test Files Location

- **Real export:** `/HealthVis/Health-Export.zip` (35 MB)
- **Sample export:** `/HealthVis/Health-Export-Sample.zip` (3 KB)
- **Scripts:** `/HealthVis/healthvis-mobile/scripts/`

## Success Criteria

✅ All validation scripts pass
✅ Sample file uploads successfully
✅ Data displays on Home screen
✅ Charts show health metrics
✅ No errors in console
✅ App remains responsive

You're ready to test! 🎉
