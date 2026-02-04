import AsyncStorage from "@react-native-async-storage/async-storage";

export type PinnedKey =
  | "sleep_score"
  | "activity_rings"
  | "heart_rate_latest"
  | "steps_today"
  | "flights_climbed"
  | "resting_energy"
  | "active_energy";

const STORAGE_KEY = "summary_pins_v1";

export async function loadPinnedKeys(): Promise<PinnedKey[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return ["sleep_score", "activity_rings", "heart_rate_latest", "steps_today"];
  try {
    return JSON.parse(raw);
  } catch {
    return ["sleep_score", "activity_rings", "heart_rate_latest", "steps_today"];
  }
}

export async function savePinnedKeys(keys: PinnedKey[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}