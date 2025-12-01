# Testing Guide: Audio & Haptic Feedback

## Quick Start

### 1. Generate Audio Files

**Option A - Python (2 minutes):**
```bash
pip install numpy scipy
python3 generate_tones.py
```

**Option B - Online (5 minutes):**
1. Visit: https://www.szynalski.com/tone-generator/
2. Generate: 300Hz, 500Hz, 800Hz (each 0.2 sec)
3. Save as: `tone-low.wav`, `tone-medium.wav`, `tone-high.wav`
4. Move to: `assets/audio/`

### 2. Update Code

After generating files, update `lib/sonification.ts`:
```typescript
// Replace the TONE_FILES constant with:
const TONE_FILES = {
  low: require('../assets/audio/tone-low.wav'),
  medium: require('../assets/audio/tone-medium.wav'),
  high: require('../assets/audio/tone-high.wav'),
};

// Update generateTone function to use files instead of data URI
```

### 3. Run Test Screen

```bash
npm start
# Press 'i' for iOS or scan QR for device
# Navigate to: /test-feedback
```

## What to Test

### Test Screen (`/test-feedback`)
- ✓ Audio clicks, success, error sounds
- ✓ Mode change sounds (4 modes)
- ✓ Text-to-speech
- ✓ Data sonification (10 tones)
- ✓ Haptics (light/medium/heavy)
- ✓ Touch-to-explore chart

### Main App
- ✓ Home: "Hear Summary" button
- ✓ Trends: Touch-to-explore with haptics
- ✓ Settings: Mode switching, toggles

## Troubleshooting

**No Sound?**
- Check volume, silent mode OFF
- Settings → Audio Feedback = ON
- Audio files in `assets/audio/`

**No Haptics?**
- Must use physical iPhone (not simulator)
- Settings → Haptics = ON

## Checklist

- [ ] Button clicks make sound
- [ ] Mode changes make unique sounds
- [ ] TTS speaks correctly
- [ ] Sonification plays tones
- [ ] Haptics work on device
- [ ] Touch-to-explore provides feedback
- [ ] Settings toggles work
- [ ] No console errors
