/**
 * Audio Session
 *
 * Configures the iOS audio session once, before anything plays.
 *
 * Without this the session defaults to the ambient category, which the ringer
 * switch mutes -- so sonification and feedback tones are silent on any phone
 * with the switch flipped, with no error to explain it. The expo-av code this
 * replaced set playsInSilentModeIOS: true for the same reason.
 */

import { AudioManager } from "react-native-audio-api";

let configured = false;

/**
 * Ensures the audio session is configured and active. Safe to call repeatedly.
 */
export async function ensureAudioSession(): Promise<void> {
  if (configured) return;

  try {
    AudioManager.setAudioSessionOptions({
      // "playback" plays through the silent switch. Sonification is the
      // content, not an incidental sound effect, so it should behave like
      // media rather than a UI blip.
      iosCategory: "playback",
      iosMode: "default",
      // Duck other audio instead of stopping it: a screen reader user may well
      // be listening to something else, and cutting it off is hostile.
      iosOptions: ["duckOthers"],
      // Activating a session otherwise suppresses haptics. This app plays
      // tones and haptics together -- the Haptic Pulse control and chart
      // scrubbing both depend on it -- so they have to coexist.
      iosAllowHaptics: true,
    });

    await AudioManager.setAudioSessionActivity(true);
    configured = true;
  } catch (error) {
    // Audio is an enhancement; failing to configure the session should not
    // take down the screen that asked for it.
    console.error("Failed to configure audio session:", error);
  }
}
