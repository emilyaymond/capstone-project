# Testing Instructions - Getting Started

## Overview

This document provides quick instructions for running integration tests on the Apple HealthKit migration. Integration testing **requires a physical iOS device** with actual HealthKit data.

## Prerequisites Checklist

Before starting integration tests, ensure you have:

- [ ] Physical iPhone (iOS 13.0+)
- [ ] Xcode installed on Mac
- [ ] Device connected via USB or wireless debugging
- [ ] HealthKit data populated on device (use Health app to verify)
- [ ] Development certificates configured

## Quick Start

### 1. Build for Device

```bash
cd healthvis-mobile

# Install dependencies if not already done
npm install

# Install iOS pods
cd ios && pod install && cd ..

# Build and run on connected device
npx expo run:ios --device
```

### 2. Select Your Device

When prompted, select your physical device from the list (not simulator).

### 3. Trust Developer Certificate

On first install:
1. Device will show "Untrusted Developer" message
2. Go to Settings → General → VPN & Device Management
3. Trust your developer certificate
4. Return to app and launch

### 4. Run Integration Tests

Open the testing documents:

1. **For comprehensive testing**: `INTEGRATION_TESTING_GUIDE.md`
   - Contains detailed test procedures
   - Includes expected results for each test
   - Provides space to document failures

2. **For quick testing**: `INTEGRATION_TEST_CHECKLIST.md`
   - Quick reference checklist
   - Can be completed in 30-60 minutes
   - Good for smoke testing

### 5. Document Results

As you test:
- Check off completed tests in the checklist
- Document any failures in detail
- Note device info (model, iOS version)
- Take screenshots of issues if needed

## Test Execution Order

Recommended order for efficient testing:

1. **Start with 13.1**: Complete Flow Tests
   - Tests core functionality
   - Identifies major issues early
   - Takes 20-30 minutes

2. **Then 13.2**: Accessibility Tests
   - Requires VoiceOver enabled
   - Tests audio/haptic features
   - Takes 15-20 minutes

3. **Then 13.3**: Cache & Offline Tests
   - Tests data persistence
   - Requires airplane mode
   - Takes 10-15 minutes

4. **Finally 13.4**: Performance Tests
   - Tests with large datasets
   - May require Xcode Instruments
   - Takes 15-20 minutes

**Total Time**: ~60-90 minutes for complete testing

## Common Issues & Solutions

### Issue: App won't install on device
**Solution**: 
- Check developer certificate is valid
- Ensure device is registered in Apple Developer Portal
- Try cleaning build: `cd ios && xcodebuild clean && cd ..`

### Issue: HealthKit permission dialog doesn't appear
**Solution**:
- Delete app from device
- Reinstall fresh build
- Permission dialog appears on first launch only

### Issue: No HealthKit data available
**Solution**:
- Open Health app on device
- Manually add sample data for testing
- Or use device for a few days to collect real data

### Issue: App crashes on launch
**Solution**:
- Check Xcode console for error messages
- Verify all pods installed correctly
- Ensure iOS version is 13.0+

### Issue: Simulator shows "HealthKit unavailable"
**Solution**:
- This is expected - HealthKit requires physical device
- Use physical device for all integration tests

## Testing Tips

1. **Test with real data**: Use your own health data for most realistic testing
2. **Test edge cases**: Try with no data, partial data, large datasets
3. **Test permissions**: Try granting all, some, and no permissions
4. **Test offline**: Use airplane mode to verify cache functionality
5. **Test accessibility**: Actually use VoiceOver to verify announcements
6. **Document everything**: Note any unexpected behavior

## After Testing

### If All Tests Pass ✅

1. Mark task 13 as complete in tasks.md
2. Update project status
3. Prepare for production release
4. Monitor for issues in production

### If Tests Fail ❌

1. Document all failures in detail
2. Create GitHub issues for each failure
3. Prioritize fixes by severity:
   - **Critical**: App crashes, data loss
   - **High**: Core features broken
   - **Medium**: Minor bugs, UI issues
   - **Low**: Edge cases, polish
4. Fix issues and re-test

## Need Help?

- Review `INTEGRATION_TESTING_GUIDE.md` for detailed procedures
- Check requirements in `.kiro/specs/apple-healthkit-migration/requirements.md`
- Review design in `.kiro/specs/apple-healthkit-migration/design.md`
- Check implementation in source files

## Quick Reference

| Document | Purpose | Time Required |
|----------|---------|---------------|
| `INTEGRATION_TESTING_GUIDE.md` | Detailed test procedures | Full testing |
| `INTEGRATION_TEST_CHECKLIST.md` | Quick reference | Quick testing |
| `TESTING_INSTRUCTIONS.md` | Getting started (this file) | Setup |

---

**Ready to start?** Open `INTEGRATION_TEST_CHECKLIST.md` and begin testing! 🚀
