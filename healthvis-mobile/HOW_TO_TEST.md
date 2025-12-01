# How to Access the Test Screen

## 🎯 Quick Access

The accessibility test modal is available from multiple places:

### Option 1: Settings Tab (Always Available)
1. Open the app
2. Tap the **Settings** tab at the bottom
3. Scroll to the bottom
4. Look for **"Developer Tools"** section
5. Tap **"🧪 Open Accessibility Test Screen →"**

### Option 2: Home Tab (When No Data)
1. Open the app
2. You'll see "No Health Data" message
3. Look for **"🧪 Open Test Screen →"** link
4. Tap to open the test modal

### Option 3: Direct URL
- Navigate to `/modal` in the app

## 🧪 What You Can Test

The modal includes comprehensive testing for:

### 1. Accessibility Modes
- Visual, Audio, Hybrid, Simplified
- Test mode switching with audio feedback

### 2. Settings
- Font Size: Small, Medium, Large
- Contrast: Normal, High
- Audio Feedback: ON/OFF
- Haptics: ON/OFF

### 3. Audio Feedback
- Click sound
- Success sound (rising pitch)
- Error sound (descending pitch)
- Focus sound
- Hover sound
- Mode-specific sounds

### 4. Haptic Feedback
- Light, Medium, Heavy
- Normal, Warning, Danger (data-based)
- Note: Works best on physical iPhone

### 5. Text-to-Speech
- Speak test message
- Stop button
- Hear summary (mock vitals)
- Hear details (single vital)

### 6. Screen Reader Announcements
- Polite vs Assertive priority
- Success, Error, Navigation
- Loading, Data Update
- Enable VoiceOver/TalkBack to test

### 7. AccessibleButton Component
- Primary, Secondary, Outline variants
- Disabled state
- Automatic audio/haptic feedback
- Large touch targets in simplified mode

## 💡 Pro Tips

1. **Start with Settings Tab** - It's always accessible
2. **Test on Physical Device** - Haptics work best on real iPhone
3. **Enable VoiceOver** - To test screen reader announcements
4. **Try All Modes** - Each mode behaves differently
5. **Toggle Audio/Haptics** - Verify they respect the settings

## 🚀 Next Steps

Once you've tested the modal:
1. Generate audio files: `python3 generate_tones.py`
2. Test sonification features
3. Continue to Task 30 in the spec

Happy testing! 🎉
