import { storageGetItem, storageSetItem } from "../utils/appStorage";
import {
  COINS_STORAGE_KEY,
  COMPLETED_LEVELS_STORAGE_KEY,
  DEFAULT_CLASSIC_PACK_ID,
  NO_ADS_ITEM_ID,
  PLAYER_PROGRESS_STORAGE_KEY,
} from "./constants";

export type PersistedPlayerProgress = {
  level: number;
  coins: number;
  noAdsOwned: boolean;
  purchasedStoreItemIds: string[];
  equippedThemeCosmeticId: string | null;
  equippedBoardCosmeticId: string | null;
  completedLevelKeys: string[];
  completedLevelsCount: number;
  levelsSinceLastInterstitialAd: number;
  lastInterstitialAdAt: number | null;
};

export type CompletionMode = "classic" | "daily" | "weekly";

function toNonNegativeInt(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

async function readLegacyCompletedLevels(): Promise<Set<number>> {
  try {
    const rawValue = await storageGetItem(COMPLETED_LEVELS_STORAGE_KEY);
    if (!rawValue) {
      return new Set();
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsedValue)) {
      return new Set();
    }

    return new Set(
      parsedValue.filter((value): value is number => typeof value === "number"),
    );
  } catch {
    return new Set();
  }
}

export function completionKey(mode: CompletionMode, levelId: number): string {
  return `${mode}:${levelId}`;
}

export function classicPackCompletionKey(
  packId: string,
  levelId: number,
): string {
  return `classic:${packId}:${levelId}`;
}

export function getCompletedLevelIdsForMode(
  completedLevelKeys: Set<string>,
  mode: CompletionMode,
): Set<number> {
  const result = new Set<number>();

  for (const key of completedLevelKeys) {
    const [entryMode, levelText] = key.split(":");
    if (entryMode !== mode) {
      continue;
    }

    const levelNumber = Number(levelText);
    if (Number.isFinite(levelNumber)) {
      result.add(levelNumber);
    }
  }

  return result;
}

export function getCompletedLevelIdsForClassicPack(
  completedLevelKeys: Set<string>,
  packId: string,
): Set<number> {
  const result = new Set<number>();
  const classicPrefix = `classic:${packId}:`;

  for (const key of completedLevelKeys) {
    if (!key.startsWith(classicPrefix)) {
      continue;
    }

    const levelNumber = Number(key.slice(classicPrefix.length));
    if (Number.isFinite(levelNumber)) {
      result.add(levelNumber);
    }
  }

  return result;
}

function migrateClassicCompletionKeys(keys: string[]): string[] {
  return keys.map((key) => {
    const parts = key.split(":");

    if (parts.length === 2 && parts[0] === "classic") {
      const levelNumber = Number(parts[1]);
      if (Number.isFinite(levelNumber)) {
        return classicPackCompletionKey(DEFAULT_CLASSIC_PACK_ID, levelNumber);
      }
    }

    return key;
  });
}

function defaultPlayerProgress(): PersistedPlayerProgress {
  return {
    level: 1,
    coins: 0,
    noAdsOwned: false,
    purchasedStoreItemIds: [],
    equippedThemeCosmeticId: null,
    equippedBoardCosmeticId: null,
    completedLevelKeys: [],
    completedLevelsCount: 0,
    levelsSinceLastInterstitialAd: 0,
    lastInterstitialAdAt: null,
  };
}

export async function readPlayerProgress(): Promise<PersistedPlayerProgress> {
  try {
    const rawValue = await storageGetItem(PLAYER_PROGRESS_STORAGE_KEY);
    const legacyCoinsRawValue = await storageGetItem(COINS_STORAGE_KEY);
    const legacyCoins = toNonNegativeInt(legacyCoinsRawValue, 0);

    if (!rawValue) {
      const legacyCompletedLevelKeys = Array.from(
        await readLegacyCompletedLevels(),
      ).map((levelId) => completionKey("classic", levelId));
      return {
        ...defaultPlayerProgress(),
        coins: legacyCoins,
        completedLevelKeys: legacyCompletedLevelKeys,
        completedLevelsCount: legacyCompletedLevelKeys.length,
      };
    }

    const parsedValue = JSON.parse(
      rawValue,
    ) as Partial<PersistedPlayerProgress>;
    const purchasedStoreItemIds = Array.isArray(
      parsedValue.purchasedStoreItemIds,
    )
      ? parsedValue.purchasedStoreItemIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [];

    const noAdsOwned = Boolean(parsedValue.noAdsOwned);
    if (noAdsOwned && !purchasedStoreItemIds.includes(NO_ADS_ITEM_ID)) {
      purchasedStoreItemIds.push(NO_ADS_ITEM_ID);
    }

    const completedLevelKeys = Array.isArray(parsedValue.completedLevelKeys)
      ? parsedValue.completedLevelKeys.filter(
          (value): value is string => typeof value === "string",
        )
      : Array.isArray(
            (parsedValue as { completedLevelIds?: unknown }).completedLevelIds,
          )
        ? (parsedValue as { completedLevelIds: unknown[] }).completedLevelIds
            .filter((value): value is number => typeof value === "number")
            .map((value) => completionKey("classic", value))
        : [];

    const migratedCompletedLevelKeys =
      migrateClassicCompletionKeys(completedLevelKeys);

    return {
      level: toNonNegativeInt(parsedValue.level, 1) || 1,
      coins: toNonNegativeInt(parsedValue.coins, legacyCoins),
      noAdsOwned,
      purchasedStoreItemIds,
      equippedThemeCosmeticId:
        typeof parsedValue.equippedThemeCosmeticId === "string"
          ? parsedValue.equippedThemeCosmeticId
          : typeof (parsedValue as { equippedCosmeticId?: unknown })
                .equippedCosmeticId === "string"
            ? ((parsedValue as { equippedCosmeticId: string })
                .equippedCosmeticId ?? null)
            : null,
      equippedBoardCosmeticId:
        typeof parsedValue.equippedBoardCosmeticId === "string"
          ? parsedValue.equippedBoardCosmeticId
          : null,
      completedLevelKeys: migratedCompletedLevelKeys,
      completedLevelsCount: toNonNegativeInt(
        parsedValue.completedLevelsCount,
        migratedCompletedLevelKeys.length,
      ),
      levelsSinceLastInterstitialAd: toNonNegativeInt(
        parsedValue.levelsSinceLastInterstitialAd,
        0,
      ),
      lastInterstitialAdAt:
        typeof parsedValue.lastInterstitialAdAt === "number"
          ? parsedValue.lastInterstitialAdAt
          : null,
    };
  } catch {
    const fallbackCoins = toNonNegativeInt(
      await storageGetItem(COINS_STORAGE_KEY),
      0,
    );
    return {
      ...defaultPlayerProgress(),
      coins: fallbackCoins,
    };
  }
}

export async function writePlayerProgress(
  progress: PersistedPlayerProgress,
): Promise<void> {
  try {
    const normalizedCoins = toNonNegativeInt(progress.coins, 0);
    const legacyEquippedCosmeticId = progress.equippedThemeCosmeticId;
    await storageSetItem(
      PLAYER_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        ...progress,
        coins: normalizedCoins,
        equippedCosmeticId: legacyEquippedCosmeticId,
      }),
    );
    await storageSetItem(COINS_STORAGE_KEY, String(normalizedCoins));

    const classicCompletedLevelIds = progress.completedLevelKeys
      .filter((key) => key.startsWith("classic:"))
      .map((key) => Number(key.split(":")[1]))
      .filter((value) => Number.isFinite(value));

    await storageSetItem(
      COMPLETED_LEVELS_STORAGE_KEY,
      JSON.stringify(classicCompletedLevelIds),
    );
  } catch {
    // Ignore storage failures; the game should remain playable.
  }
}
