import { storageGetItem, storageSetItem } from "./appStorage";

export const SETTINGS_STORAGE_KEY = "node-master.settings";

export type PersistedSettings = {
  soundEnabled: boolean;
};

export const DEFAULT_SETTINGS: PersistedSettings = {
  soundEnabled: true,
};

export function parseSettings(rawValue: string | null): PersistedSettings {
  if (!rawValue) {
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedSettings>;

    return {
      soundEnabled:
        typeof parsed.soundEnabled === "boolean"
          ? parsed.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function readSettings(): Promise<PersistedSettings> {
  const rawValue = await storageGetItem(SETTINGS_STORAGE_KEY);
  return parseSettings(rawValue);
}

export async function writeSettings(
  settings: PersistedSettings,
): Promise<void> {
  await storageSetItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
