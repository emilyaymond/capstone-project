import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./storage-keys";

export type PinnedKey =
  | "sleep_score"
  | "activity_rings"
  | "heart_rate_latest"
  | "steps_today"
  | "flights_climbed"
  | "resting_energy"
  | "active_energy";



export async function loadPinnedKeys(): Promise<PinnedKey[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.SUMMARY_PINS);
  if (!raw) return ["sleep_score", "activity_rings", "heart_rate_latest", "steps_today"];
  try {
    return JSON.parse(raw);
  } catch {
    return ["sleep_score", "activity_rings", "heart_rate_latest", "steps_today"];
  }
}

export async function savePinnedKeys(keys: PinnedKey[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.SUMMARY_PINS, JSON.stringify(keys));
}