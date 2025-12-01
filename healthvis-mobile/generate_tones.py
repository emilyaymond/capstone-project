#!/usr/bin/env python3
"""
Generate audio tone files for sonification

Creates three WAV files with sine wave tones:
- tone-low.wav: 300 Hz (normal range)
- tone-medium.wav: 500 Hz (normal range)
- tone-high.wav: 800 Hz (warning/danger range)

Requirements:
    pip install numpy scipy

Usage:
    python3 generate_tones.py
"""

import numpy as np
from scipy.io import wavfile
import os

# Configuration
SAMPLE_RATE = 44100  # Hz
DURATION = 0.2  # seconds (200ms)
FADE_DURATION = 0.01  # seconds (10ms fade in/out to avoid clicks)

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'audio')

# Tone frequencies (Hz)
TONES = {
    'tone-low.wav': 300,
    'tone-medium.wav': 500,
    'tone-high.wav': 800,
}


def generate_tone(frequency, duration, sample_rate, fade_duration):
    """
    Generate a sine wave tone with fade in/out
    
    Args:
        frequency: Frequency in Hz
        duration: Duration in seconds
        sample_rate: Sample rate in Hz
        fade_duration: Fade in/out duration in seconds
    
    Returns:
        numpy array of audio samples (16-bit PCM)
    """
    # Generate time array
    num_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, num_samples, endpoint=False)
    
    # Generate sine wave
    audio = np.sin(2 * np.pi * frequency * t)
    
    # Apply fade in/out to avoid clicks
    fade_samples = int(sample_rate * fade_duration)
    
    if fade_samples > 0:
        # Fade in
        fade_in = np.linspace(0, 1, fade_samples)
        audio[:fade_samples] *= fade_in
        
        # Fade out
        fade_out = np.linspace(1, 0, fade_samples)
        audio[-fade_samples:] *= fade_out
    
    # Convert to 16-bit PCM
    audio = (audio * 32767).astype(np.int16)
    
    return audio


def main():
    """Generate all tone files"""
    # Create output directory if it doesn't exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"Generating audio tones in: {OUTPUT_DIR}\n")
    
    # Generate each tone
    for filename, frequency in TONES.items():
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        print(f"Generating {filename}:")
        print(f"  Frequency: {frequency} Hz")
        print(f"  Duration: {DURATION * 1000:.0f} ms")
        print(f"  Sample rate: {SAMPLE_RATE} Hz")
        
        # Generate audio
        audio = generate_tone(frequency, DURATION, SAMPLE_RATE, FADE_DURATION)
        
        # Write WAV file
        wavfile.write(output_path, SAMPLE_RATE, audio)
        
        # Get file size
        file_size = os.path.getsize(output_path)
        print(f"  Output: {output_path}")
        print(f"  Size: {file_size:,} bytes\n")
    
    print("✅ All tones generated successfully!")
    print("\nNext steps:")
    print("1. Update lib/sonification.ts to use these files")
    print("2. Test in the app with 'npm run ios' or 'npm run android'")


if __name__ == '__main__':
    try:
        main()
    except ImportError as e:
        print("❌ Error: Missing required packages")
        print("\nPlease install dependencies:")
        print("  pip install numpy scipy")
        print("\nOr using conda:")
        print("  conda install numpy scipy")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
