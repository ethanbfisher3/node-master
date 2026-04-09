import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, StatusBar, View, Text, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { LevelData, PRE_GENERATED_LEVELS } from "./data/levels";
import { CompleteScreen } from "./screens/CompleteScreen";
import { GameScreen } from "./screens/GameScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LevelPackScreen } from "./screens/LevelPackScreen";
import { LevelsScreen } from "./screens/LevelsScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { StoreScreen } from "./screens/StoreScreen";
import { TimeTrialResultScreen } from "./screens/TimeTrialResultScreen";
import { TimeTrialScreen } from "./screens/TimeTrialScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import cosmetics, {
  AppThemePalette,
  Cosmetic,
  resolveAppTheme,
  resolveNodeLineStyle,
} from "./data/cosmetics";
import { createLevelPacks, LevelPack } from "./data/levelPacks";
import { GAME_HEIGHT, GAME_WIDTH, styles } from "./styles";
import { doIntersect } from "./utils/geometry";
import { storageGetItem, storageSetItem } from "./utils/appStorage";
import {
  generateLevel,
  Link,
  Node,
  normalizeNodePositions,
  resolveNodePositionImmediate,
} from "./utils/gameLogic";
import { CoinPack } from "./data/coinPacks";

export type ViewType =
  | "home"
  | "admin"
  | "level-packs"
  | "levels"
  | "daily-weekly-levels"
  | "time-trial"
  | "store"
  | "game"
  | "complete"
  | "time-trial-result"
  | "settings";

type PlayMode = "classic" | "daily" | "weekly" | "time-trial";

type TrialDuration = 30 | 60 | 120;

type TimeTrialState = {
  nodeCount: number | null;
  durationSeconds: TrialDuration;
  timeLeftSeconds: number;
  active: boolean;
  solvedCount: number;
  earnedCoins: number;
};

const NO_ADS_PRICE = 5.0;
const NO_ADS_ITEM_ID = "item:no-ads";
const POPUP_AD_DURATION_SECONDS = 5;
const DAILY_LEVEL_IDS = Array.from({ length: 10 }, (_, index) => index + 1);
const WEEKLY_LEVEL_IDS = Array.from({ length: 50 }, (_, index) => index + 1);
const PLAYER_PROGRESS_STORAGE_KEY = "node-master.player-progress";
const COINS_STORAGE_KEY = "node-master.coins";
const COMPLETED_LEVELS_STORAGE_KEY = "node-master.completed-levels";
const SOLVED_HOLD_DURATION_MS = 700;
const MIN_LEVELS_BETWEEN_INTERSTITIAL_ADS = 3;
const MIN_TIME_BETWEEN_INTERSTITIAL_ADS_MS = 3 * 60 * 1000;

type PersistedPlayerProgress = {
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

type CompletionMode = "classic" | "daily" | "weekly";

const DEFAULT_CLASSIC_PACK_ID = "starter-1";
const MIN_TIME_TRIAL_INTERSECTIONS = 2;
const MAX_TIME_TRIAL_GENERATION_ATTEMPTS = 24;

function enrichTimeTrialLinks(nodes: Node[], links: Link[]): Link[] {
  const nextLinks = JSON.parse(JSON.stringify(links)) as Link[];
  const targetLinkCount = Math.min(
    nodes.length + Math.max(2, Math.floor(nodes.length / 2)),
    20,
  );

  let attempts = 0;
  while (nextLinks.length < targetLinkCount && attempts < 240) {
    attempts++;
    const firstNode = nodes[Math.floor(Math.random() * nodes.length)];
    const secondNode = nodes[Math.floor(Math.random() * nodes.length)];

    if (!firstNode || !secondNode || firstNode.id === secondNode.id) {
      continue;
    }

    const exists = nextLinks.some(
      (entry) =>
        (entry.node1Id === firstNode.id && entry.node2Id === secondNode.id) ||
        (entry.node1Id === secondNode.id && entry.node2Id === firstNode.id),
    );

    if (exists) {
      continue;
    }

    nextLinks.push({
      id: `tt-link-${nextLinks.length}-${attempts}`,
      node1Id: firstNode.id,
      node2Id: secondNode.id,
      color: "#94a3b8",
    });
  }

  return nextLinks;
}

function getIntersectingLinkIds(
  currentNodes: Node[],
  currentLinks: Link[],
): Set<string> {
  const intersections = new Set<string>();

  for (let i = 0; i < currentLinks.length; i++) {
    for (let j = i + 1; j < currentLinks.length; j++) {
      const firstLink = currentLinks[i];
      const secondLink = currentLinks[j];

      if (
        firstLink.node1Id === secondLink.node1Id ||
        firstLink.node1Id === secondLink.node2Id ||
        firstLink.node2Id === secondLink.node1Id ||
        firstLink.node2Id === secondLink.node2Id
      ) {
        continue;
      }

      const firstNodeA = currentNodes.find(
        (node) => node.id === firstLink.node1Id,
      );
      const firstNodeB = currentNodes.find(
        (node) => node.id === firstLink.node2Id,
      );
      const secondNodeA = currentNodes.find(
        (node) => node.id === secondLink.node1Id,
      );
      const secondNodeB = currentNodes.find(
        (node) => node.id === secondLink.node2Id,
      );

      if (!firstNodeA || !firstNodeB || !secondNodeA || !secondNodeB) {
        continue;
      }

      if (doIntersect(firstNodeA, firstNodeB, secondNodeA, secondNodeB)) {
        intersections.add(firstLink.id);
        intersections.add(secondLink.id);
      }
    }
  }

  return intersections;
}

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

function completionKey(mode: CompletionMode, levelId: number): string {
  return `${mode}:${levelId}`;
}

function classicPackCompletionKey(packId: string, levelId: number): string {
  return `classic:${packId}:${levelId}`;
}

function getCompletedLevelIdsForMode(
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

function getCompletedLevelIdsForClassicPack(
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

async function readPlayerProgress(): Promise<PersistedPlayerProgress> {
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

async function writePlayerProgress(
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

    // Keep the legacy key updated for backwards compatibility with old builds.
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

export default function App() {
  const [view, setView] = useState<ViewType>("home");
  const [playMode, setPlayMode] = useState<PlayMode>("classic");
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(1000);
  const [noAdsOwned, setNoAdsOwned] = useState(false);
  const [purchasedStoreItemIds, setPurchasedStoreItemIds] = useState<
    Set<string>
  >(new Set());
  const [equippedThemeCosmeticId, setEquippedThemeCosmeticId] = useState<
    string | null
  >(null);
  const [equippedBoardCosmeticId, setEquippedBoardCosmeticId] = useState<
    string | null
  >(null);
  const [selectedLevelPackId, setSelectedLevelPackId] = useState<string | null>(
    null,
  );
  const [completedLevelKeys, setCompletedLevelKeys] = useState<Set<string>>(
    new Set(),
  );
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [intersectingLinks, setIntersectingLinks] = useState<Set<string>>(
    new Set(),
  );
  const [moves, setMoves] = useState(0);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [completedLevelsCount, setCompletedLevelsCount] = useState(0);
  const [levelsSinceLastInterstitialAd, setLevelsSinceLastInterstitialAd] =
    useState(0);
  const [lastInterstitialAdAt, setLastInterstitialAdAt] = useState<
    number | null
  >(null);
  const [isProgressHydrated, setIsProgressHydrated] = useState(false);
  const [sessionLevelIds, setSessionLevelIds] = useState<number[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [popupAdVisible, setPopupAdVisible] = useState(false);
  const [popupAdSecondsLeft, setPopupAdSecondsLeft] = useState(
    POPUP_AD_DURATION_SECONDS,
  );
  const [pendingPopupAdAction, setPendingPopupAdAction] = useState<
    (() => void) | null
  >(null);
  const [timeTrialState, setTimeTrialState] = useState<TimeTrialState>({
    nodeCount: null,
    durationSeconds: 30,
    timeLeftSeconds: 0,
    active: false,
    solvedCount: 0,
    earnedCoins: 0,
  });
  const completionHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const generatedModeLevelsRef = useRef<
    Map<string, { nodes: Node[]; links: Link[] }>
  >(new Map());

  const levelById = useMemo(() => {
    const map = new Map<number, LevelData>();
    for (const entry of PRE_GENERATED_LEVELS) {
      map.set(entry.id, entry);
    }
    return map;
  }, []);

  const levelPacks = useMemo<LevelPack[]>(
    () => createLevelPacks(PRE_GENERATED_LEVELS.length),
    [],
  );

  const levelPacksWithOwnership = useMemo(
    () =>
      levelPacks.map((pack) => ({
        ...pack,
        owned:
          pack.defaultOwned ||
          (pack.storeItemId
            ? purchasedStoreItemIds.has(pack.storeItemId)
            : false),
      })),
    [levelPacks, purchasedStoreItemIds],
  );

  const selectedLevelPack = useMemo(() => {
    if (!levelPacksWithOwnership.length) {
      return null;
    }

    const explicit = levelPacksWithOwnership.find(
      (pack) => pack.id === selectedLevelPackId,
    );
    if (explicit) {
      return explicit;
    }

    return levelPacksWithOwnership.find((pack) => pack.owned) ?? null;
  }, [levelPacksWithOwnership, selectedLevelPackId]);

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    if (Platform.OS === "ios") {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
      });
    } else if (Platform.OS === "android") {
      Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
      });
    }

    console.log("Purchases configured");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateProgress = async () => {
      const progress = await readPlayerProgress();
      if (cancelled) {
        return;
      }

      setLevel(progress.level);
      setCoins(progress.coins);
      setNoAdsOwned(progress.noAdsOwned);
      setPurchasedStoreItemIds(new Set(progress.purchasedStoreItemIds));
      setEquippedThemeCosmeticId(progress.equippedThemeCosmeticId);
      setEquippedBoardCosmeticId(progress.equippedBoardCosmeticId);
      setCompletedLevelKeys(new Set(progress.completedLevelKeys));
      setCompletedLevelsCount(progress.completedLevelsCount);
      setLevelsSinceLastInterstitialAd(progress.levelsSinceLastInterstitialAd);
      setLastInterstitialAdAt(progress.lastInterstitialAdAt ?? Date.now());
      setIsProgressHydrated(true);
    };

    void hydrateProgress();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isProgressHydrated) {
      return;
    }

    void writePlayerProgress({
      level,
      coins,
      noAdsOwned,
      purchasedStoreItemIds: Array.from(purchasedStoreItemIds),
      equippedThemeCosmeticId,
      equippedBoardCosmeticId,
      completedLevelKeys: Array.from(completedLevelKeys),
      completedLevelsCount,
      levelsSinceLastInterstitialAd,
      lastInterstitialAdAt,
    });
  }, [
    coins,
    completedLevelKeys,
    completedLevelsCount,
    equippedBoardCosmeticId,
    equippedThemeCosmeticId,
    isProgressHydrated,
    level,
    noAdsOwned,
    purchasedStoreItemIds,
    lastInterstitialAdAt,
    levelsSinceLastInterstitialAd,
  ]);

  const appTheme = useMemo<AppThemePalette>(
    () => resolveAppTheme(equippedThemeCosmeticId),
    [equippedThemeCosmeticId],
  );

  const activeNodeLineStyle = useMemo(
    () => resolveNodeLineStyle(equippedBoardCosmeticId),
    [equippedBoardCosmeticId],
  );

  const activeClassicPackId = selectedLevelPack?.id ?? DEFAULT_CLASSIC_PACK_ID;

  const completedClassicLevelIds = useMemo(
    () =>
      getCompletedLevelIdsForClassicPack(
        completedLevelKeys,
        activeClassicPackId,
      ),
    [activeClassicPackId, completedLevelKeys],
  );

  const completedDailyLevelIds = useMemo(
    () => getCompletedLevelIdsForMode(completedLevelKeys, "daily"),
    [completedLevelKeys],
  );

  const completedWeeklyLevelIds = useMemo(
    () => getCompletedLevelIdsForMode(completedLevelKeys, "weekly"),
    [completedLevelKeys],
  );

  const clearCompletionHold = useCallback(() => {
    if (!completionHoldTimeoutRef.current) {
      return;
    }

    clearTimeout(completionHoldTimeoutRef.current);
    completionHoldTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearCompletionHold();
    };
  }, [clearCompletionHold]);

  const loadLevel = useCallback(
    (levelId: number, mode: PlayMode, forcedTimeTrialNodeCount?: number) => {
      clearCompletionHold();
      let nextNodes: Node[] = [];
      let nextLinks: Link[] = [];

      if (mode === "daily" || mode === "weekly" || mode === "time-trial") {
        const cacheKey = `${mode}-${levelId}`;
        const shouldUseCache = mode !== "time-trial";
        const cachedLevel = shouldUseCache
          ? generatedModeLevelsRef.current.get(cacheKey)
          : undefined;

        if (cachedLevel) {
          nextNodes = JSON.parse(JSON.stringify(cachedLevel.nodes));
          nextLinks = JSON.parse(JSON.stringify(cachedLevel.links));
        } else {
          const nodeCount =
            mode === "time-trial"
              ? Math.max(
                  5,
                  forcedTimeTrialNodeCount ?? timeTrialState.nodeCount ?? 7,
                )
              : 7 + Math.floor(Math.random() * 7);

          if (mode === "time-trial") {
            let generatedNodes: Node[] = [];
            let generatedLinks: Link[] = [];

            for (
              let attempt = 0;
              attempt < MAX_TIME_TRIAL_GENERATION_ATTEMPTS;
              attempt++
            ) {
              // Keep the requested node count exact for time trial generation.
              const generatorLevel = (nodeCount - 4) * 2;
              const generatedLevel = generateLevel(
                generatorLevel,
                GAME_WIDTH,
                GAME_HEIGHT,
              );
              const enrichedLinks = enrichTimeTrialLinks(
                generatedLevel.nodes,
                generatedLevel.links,
              );

              const normalizedAttemptNodes = normalizeNodePositions(
                JSON.parse(JSON.stringify(generatedLevel.nodes)),
                GAME_WIDTH,
                GAME_HEIGHT,
              );
              const attemptIntersections = getIntersectingLinkIds(
                normalizedAttemptNodes,
                enrichedLinks,
              );

              generatedNodes = normalizedAttemptNodes;
              generatedLinks = JSON.parse(JSON.stringify(enrichedLinks));

              if (attemptIntersections.size >= MIN_TIME_TRIAL_INTERSECTIONS) {
                break;
              }
            }

            nextNodes = generatedNodes;
            nextLinks = generatedLinks;
          } else {
            const generatorLevel = (nodeCount - 4) * 2;
            const generatedLevel = generateLevel(
              generatorLevel,
              GAME_WIDTH,
              GAME_HEIGHT,
            );

            generatedModeLevelsRef.current.set(cacheKey, {
              nodes: JSON.parse(JSON.stringify(generatedLevel.nodes)),
              links: JSON.parse(JSON.stringify(generatedLevel.links)),
            });

            nextNodes = JSON.parse(JSON.stringify(generatedLevel.nodes));
            nextLinks = JSON.parse(JSON.stringify(generatedLevel.links));
          }
        }
      } else {
        const levelData = levelById.get(levelId) ?? PRE_GENERATED_LEVELS[0];
        nextNodes = JSON.parse(JSON.stringify(levelData.nodes));
        nextLinks = JSON.parse(JSON.stringify(levelData.links));
      }

      const normalizedNodes =
        mode === "time-trial"
          ? nextNodes
          : normalizeNodePositions(nextNodes, GAME_WIDTH, GAME_HEIGHT);

      setNodes(normalizedNodes);
      setLinks(nextLinks);
      setLevel(levelId);
      setMoves(0);
      setIsLevelComplete(false);
      setPlayMode(mode);
      setView("game");
      checkIntersections(normalizedNodes, nextLinks, false);
    },
    [clearCompletionHold, levelById, timeTrialState.nodeCount],
  );

  const startSession = useCallback(
    (mode: PlayMode, levelIds: number[], forcedTimeTrialNodeCount?: number) => {
      if (levelIds.length === 0) {
        return;
      }
      setSessionLevelIds(levelIds);
      setSessionIndex(0);
      loadLevel(levelIds[0], mode, forcedTimeTrialNodeCount);
    },
    [loadLevel],
  );

  const startClassicLevel = useCallback(
    (levelId: number) => {
      setSessionLevelIds([]);
      setSessionIndex(0);
      loadLevel(levelId, "classic");
    },
    [loadLevel],
  );

  const startDailyLevel = useCallback(
    (levelId: number) => {
      const levelIndex = DAILY_LEVEL_IDS.indexOf(levelId);
      if (levelIndex < 0) {
        return;
      }

      setSessionLevelIds(DAILY_LEVEL_IDS);
      setSessionIndex(levelIndex);
      loadLevel(levelId, "daily");
    },
    [loadLevel],
  );

  const startWeeklyLevel = useCallback(
    (levelId: number) => {
      const levelIndex = WEEKLY_LEVEL_IDS.indexOf(levelId);
      if (levelIndex < 0) {
        return;
      }

      setSessionLevelIds(WEEKLY_LEVEL_IDS);
      setSessionIndex(levelIndex);
      loadLevel(levelId, "weekly");
    },
    [loadLevel],
  );

  const startTimeTrial = useCallback(
    (nodeCount: number, duration: TrialDuration) => {
      const ordered = Array.from(
        { length: Math.max(PRE_GENERATED_LEVELS.length, 20) },
        (_, index) => index + 1,
      );

      setTimeTrialState({
        nodeCount,
        durationSeconds: duration,
        timeLeftSeconds: duration,
        active: true,
        solvedCount: 0,
        earnedCoins: 0,
      });
      startSession("time-trial", ordered, nodeCount);
    },
    [startSession],
  );

  useEffect(() => {
    if (!popupAdVisible) {
      return;
    }

    if (popupAdSecondsLeft <= 0) {
      const nextAction = pendingPopupAdAction;
      setPopupAdVisible(false);
      setPopupAdSecondsLeft(POPUP_AD_DURATION_SECONDS);
      setPendingPopupAdAction(null);
      nextAction?.();
      return;
    }

    const timeoutId = setTimeout(() => {
      setPopupAdSecondsLeft((previousSeconds) => previousSeconds - 1);
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pendingPopupAdAction, popupAdSecondsLeft, popupAdVisible]);

  const showPopupAd = useCallback(
    (nextAction: () => void) => {
      if (noAdsOwned) {
        nextAction();
        return;
      }

      setPopupAdSecondsLeft(POPUP_AD_DURATION_SECONDS);
      setPendingPopupAdAction(() => nextAction);
      setPopupAdVisible(true);
    },
    [noAdsOwned],
  );

  const endTimeTrial = useCallback(() => {
    showPopupAd(() => {
      setTimeTrialState((previous) => ({ ...previous, active: false }));
      setView("time-trial-result");
    });
  }, [showPopupAd]);

  const advanceSessionAfterWin = useCallback(() => {
    if (playMode === "classic") {
      setView("complete");
      return;
    }

    if (playMode === "time-trial") {
      if (sessionLevelIds.length === 0) {
        return;
      }
      const nextIndex = (sessionIndex + 1) % sessionLevelIds.length;
      setSessionIndex(nextIndex);
      loadLevel(sessionLevelIds[nextIndex], "time-trial");
      return;
    }

    setView("complete");
  }, [loadLevel, playMode, sessionIndex, sessionLevelIds]);

  const continueAfterWin = useCallback(() => {
    if (playMode === "time-trial") {
      setTimeout(() => {
        setIsLevelComplete(false);
        advanceSessionAfterWin();
      }, 250);
      return;
    }

    setTimeout(() => {
      setView("complete");
    }, 500);
  }, [advanceSessionAfterWin, playMode]);

  const handleWin = useCallback(() => {
    clearCompletionHold();
    setIsLevelComplete(true);

    if (playMode === "time-trial") {
      const earned = 15 + Math.max(0, 40 - moves);
      setCoins((previousCoins) => previousCoins + earned);
      setTimeTrialState((previous) => ({
        ...previous,
        solvedCount: previous.solvedCount + 1,
        earnedCoins: previous.earnedCoins + earned,
      }));

      continueAfterWin();
      return;
    }

    const modeForCompletion: CompletionMode =
      playMode === "daily" || playMode === "weekly" ? playMode : "classic";
    const levelCompletionKey =
      modeForCompletion === "classic"
        ? classicPackCompletionKey(activeClassicPackId, level)
        : completionKey(modeForCompletion, level);
    const didCompleteNewLevel = !completedLevelKeys.has(levelCompletionKey);

    if (didCompleteNewLevel) {
      setCompletedLevelKeys((previousCompletedLevels) => {
        const nextCompletedLevels = new Set(previousCompletedLevels);
        nextCompletedLevels.add(levelCompletionKey);
        return nextCompletedLevels;
      });
    }

    const nextCompletedLevels = didCompleteNewLevel
      ? completedLevelsCount + 1
      : completedLevelsCount;
    if (didCompleteNewLevel) {
      setCompletedLevelsCount(nextCompletedLevels);
    }

    const earned = level * 10 + Math.max(0, 50 - moves);
    setCoins((previousCoins) => previousCoins + earned);

    const now = Date.now();
    const nextAdEligibleLevelCount = levelsSinceLastInterstitialAd + 1;
    const hasEnoughLevels =
      nextAdEligibleLevelCount >= MIN_LEVELS_BETWEEN_INTERSTITIAL_ADS;
    const hasCooldownElapsed =
      lastInterstitialAdAt === null ||
      now - lastInterstitialAdAt >= MIN_TIME_BETWEEN_INTERSTITIAL_ADS_MS;

    if (!noAdsOwned && hasEnoughLevels && hasCooldownElapsed) {
      setLevelsSinceLastInterstitialAd(0);
      setLastInterstitialAdAt(now);
      showPopupAd(continueAfterWin);
      return;
    }

    setLevelsSinceLastInterstitialAd(nextAdEligibleLevelCount);

    continueAfterWin();
  }, [
    clearCompletionHold,
    completedLevelsCount,
    activeClassicPackId,
    continueAfterWin,
    lastInterstitialAdAt,
    level,
    moves,
    playMode,
    noAdsOwned,
    levelsSinceLastInterstitialAd,
    showPopupAd,
  ]);

  const checkIntersections = useCallback(
    (
      currentNodes: Node[],
      currentLinks: Link[],
      triggerWin: boolean = true,
    ) => {
      const intersections = getIntersectingLinkIds(currentNodes, currentLinks);

      setIntersectingLinks(intersections);

      if (!triggerWin || currentLinks.length === 0) {
        clearCompletionHold();
        return;
      }

      if (intersections.size > 0) {
        clearCompletionHold();
        if (isLevelComplete) {
          setIsLevelComplete(false);
        }
        return;
      }

      if (!isLevelComplete && !completionHoldTimeoutRef.current) {
        completionHoldTimeoutRef.current = setTimeout(() => {
          completionHoldTimeoutRef.current = null;
          handleWin();
        }, SOLVED_HOLD_DURATION_MS);
      }
    },
    [clearCompletionHold, handleWin, isLevelComplete],
  );

  useEffect(() => {
    if (
      view !== "game" ||
      playMode !== "time-trial" ||
      !timeTrialState.active
    ) {
      return;
    }

    const timerId = setInterval(() => {
      setTimeTrialState((previous) => {
        if (!previous.active) {
          return previous;
        }
        if (previous.timeLeftSeconds <= 1) {
          return { ...previous, timeLeftSeconds: 0, active: false };
        }
        return { ...previous, timeLeftSeconds: previous.timeLeftSeconds - 1 };
      });
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [playMode, timeTrialState.active, view]);

  useEffect(() => {
    if (
      playMode === "time-trial" &&
      view === "game" &&
      !timeTrialState.active &&
      timeTrialState.timeLeftSeconds === 0 &&
      !popupAdVisible &&
      !pendingPopupAdAction
    ) {
      endTimeTrial();
    }
  }, [
    endTimeTrial,
    pendingPopupAdAction,
    playMode,
    popupAdVisible,
    timeTrialState.active,
    timeTrialState.timeLeftSeconds,
    view,
  ]);

  const handleNodeDrag = useCallback(
    (id: string, x: number, y: number) => {
      setNodes((previousNodes) => {
        const nextNode = { id, x, y };
        const nextNodes = previousNodes.map((node) =>
          node.id === id ? nextNode : node,
        );
        checkIntersections(nextNodes, links);
        return nextNodes;
      });

      setMoves((previousMoves) =>
        previousMoves === 0 ? 1 : previousMoves + 1,
      );
    },
    [checkIntersections, links],
  );

  const handleNodeDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      setNodes((previousNodes) => {
        const snappedNode = resolveNodePositionImmediate(
          id,
          x,
          y,
          previousNodes,
          GAME_WIDTH,
          GAME_HEIGHT,
        );
        const nextNodes = previousNodes.map((node) =>
          node.id === id ? snappedNode : node,
        );
        checkIntersections(nextNodes, links);
        return nextNodes;
      });
    },
    [checkIntersections, links],
  );

  const handleRestart = useCallback(() => {
    loadLevel(level, playMode);
  }, [level, loadLevel, playMode]);

  const handleNextFromComplete = useCallback(() => {
    if (playMode === "daily" || playMode === "weekly") {
      const nextIndex = sessionIndex + 1;
      if (nextIndex >= sessionLevelIds.length) {
        setView("home");
        return;
      }
      setSessionIndex(nextIndex);
      loadLevel(sessionLevelIds[nextIndex], playMode);
      return;
    }

    startClassicLevel(level + 1);
  }, [
    level,
    loadLevel,
    playMode,
    sessionIndex,
    sessionLevelIds,
    startClassicLevel,
  ]);

  const handleBuyNoAds = useCallback(() => {
    if (noAdsOwned || coins < NO_ADS_PRICE) {
      return;
    }
    setCoins((previousCoins) => previousCoins - NO_ADS_PRICE);
    setNoAdsOwned(true);
    setPurchasedStoreItemIds((previousOwnedItems) => {
      const nextOwnedItems = new Set(previousOwnedItems);
      nextOwnedItems.add(NO_ADS_ITEM_ID);
      return nextOwnedItems;
    });
  }, [coins, noAdsOwned]);

  const handleBuyCosmetic = useCallback(
    (cosmetic: Cosmetic) => {
      const cosmeticItemKey = `cosmetic:${cosmetic.id}`;

      if (purchasedStoreItemIds.has(cosmeticItemKey)) {
        return;
      }

      if (cosmetic.priceType === "coins") {
        if (coins < cosmetic.price) {
          return;
        }

        setCoins((previousCoins) => previousCoins - cosmetic.price);
      }

      setPurchasedStoreItemIds((previousOwnedItems) => {
        const nextOwnedItems = new Set(previousOwnedItems);
        nextOwnedItems.add(cosmeticItemKey);
        return nextOwnedItems;
      });

      if (cosmetic.category === "app-theme") {
        setEquippedThemeCosmeticId(cosmetic.id);
        return;
      }

      setEquippedBoardCosmeticId(cosmetic.id);
    },
    [coins, purchasedStoreItemIds],
  );

  const handleBuyLevelPack = useCallback(
    (levelPack: LevelPack) => {
      const { storeItemId } = levelPack;

      if (levelPack.defaultOwned || !storeItemId) {
        return;
      }

      if (purchasedStoreItemIds.has(storeItemId)) {
        return;
      }

      if (levelPack.priceType === "coins") {
        if (coins < levelPack.price) {
          return;
        }

        setCoins((previousCoins) => previousCoins - levelPack.price);
      }

      setPurchasedStoreItemIds((previousOwnedItems) => {
        const nextOwnedItems = new Set(previousOwnedItems);
        nextOwnedItems.add(storeItemId);
        return nextOwnedItems;
      });
    },
    [coins, purchasedStoreItemIds],
  );

  const handleBuyCoinPack = useCallback(
    (coinPack: CoinPack) => {
      setCoins((previousCoins) => previousCoins + coinPack.coins);
    },
    [coins],
  );

  const handleApplyDefaultTheme = useCallback(() => {
    setEquippedThemeCosmeticId(null);
  }, []);

  const handleApplyCosmetic = useCallback(
    (cosmetic: Cosmetic) => {
      const cosmeticItemKey = `cosmetic:${cosmetic.id}`;
      if (!purchasedStoreItemIds.has(cosmeticItemKey)) {
        return;
      }

      if (cosmetic.category === "app-theme") {
        setEquippedThemeCosmeticId(cosmetic.id);
        return;
      }

      setEquippedBoardCosmeticId(cosmetic.id);
    },
    [purchasedStoreItemIds],
  );

  const handleSelectLevelPack = useCallback((packId: string) => {
    setSelectedLevelPackId(packId);
    setView("levels");
  }, []);

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: appTheme.background }]}
    >
      {/* <SafeAreaView style={styles.container}> */}
      <StatusBar barStyle="dark-content" />

      {view === "home" && (
        <HomeScreen
          theme={appTheme}
          coins={coins}
          onSelectLevels={() => setView("level-packs")}
          onDailyWeekly={() => setView("daily-weekly-levels")}
          onTimeTrial={() => setView("time-trial")}
          onStore={() => setView("store")}
          onAdmin={__DEV__ ? () => setView("admin") : undefined}
          onSettings={() => setView("settings")}
        />
      )}

      {view === "level-packs" && (
        <LevelPackScreen
          theme={appTheme}
          packs={levelPacksWithOwnership}
          onBack={() => setView("home")}
          goToStore={() => setView("store")}
          onSelectPack={handleSelectLevelPack}
        />
      )}

      {view === "admin" && __DEV__ && (
        <AdminScreen
          onBack={() => setView("home")}
          knownKeys={[
            PLAYER_PROGRESS_STORAGE_KEY,
            COMPLETED_LEVELS_STORAGE_KEY,
          ]}
        />
      )}

      {view === "levels" && (
        <LevelsScreen
          theme={appTheme}
          currentLevel={level}
          completedLevelIds={completedClassicLevelIds}
          title={selectedLevelPack?.name ?? "LEVELS"}
          levelIds={selectedLevelPack?.levelIds}
          onBack={() => setView("level-packs")}
          onStartLevel={startClassicLevel}
        />
      )}

      {view === "daily-weekly-levels" && (
        <LevelsScreen
          theme={appTheme}
          currentLevel={level}
          completedLevelIds={completedDailyLevelIds}
          title="DAILY / WEEKLY"
          sections={[
            {
              title: "DAILY",
              levelIds: DAILY_LEVEL_IDS,
              onStartLevel: startDailyLevel,
              completedLevelIds: completedDailyLevelIds,
            },
            {
              title: "WEEKLY",
              levelIds: WEEKLY_LEVEL_IDS,
              onStartLevel: startWeeklyLevel,
              completedLevelIds: completedWeeklyLevelIds,
            },
          ]}
          showNodeHeaders={false}
          onBack={() => setView("home")}
          onStartLevel={startDailyLevel}
        />
      )}

      {view === "time-trial" && (
        <TimeTrialScreen
          theme={appTheme}
          onBack={() => setView("home")}
          onStartTrial={startTimeTrial}
        />
      )}

      {view === "store" && (
        <StoreScreen
          theme={appTheme}
          coins={coins}
          noAdsOwned={noAdsOwned}
          noAdsPrice={NO_ADS_PRICE}
          cosmetics={cosmetics}
          levelPacks={levelPacksWithOwnership}
          purchasedStoreItemIds={purchasedStoreItemIds}
          equippedThemeCosmeticId={equippedThemeCosmeticId}
          equippedBoardCosmeticId={equippedBoardCosmeticId}
          onBack={() => setView("home")}
          onBuyNoAds={handleBuyNoAds}
          onBuyCosmetic={handleBuyCosmetic}
          onBuyLevelPack={handleBuyLevelPack}
          onBuyCoinPack={handleBuyCoinPack}
          onApplyDefaultTheme={handleApplyDefaultTheme}
          onApplyCosmetic={handleApplyCosmetic}
        />
      )}

      {view === "game" && (
        <GameScreen
          theme={appTheme}
          level={level}
          coins={coins}
          nodes={nodes}
          links={links}
          intersectingLinks={intersectingLinks}
          moves={moves}
          trialTimeLeftSeconds={
            playMode === "time-trial"
              ? timeTrialState.timeLeftSeconds
              : undefined
          }
          noAdsOwned={noAdsOwned}
          nodeLineStyle={activeNodeLineStyle}
          onBackHome={() => setView("home")}
          onOpenLevels={() => {
            if (playMode === "daily" || playMode === "weekly") {
              setView("daily-weekly-levels");
              return;
            }
            if (playMode === "time-trial") {
              setView("time-trial");
              return;
            }
            setView("levels");
          }}
          onRestart={handleRestart}
          onNodeDrag={handleNodeDrag}
          onNodeDragEnd={handleNodeDragEnd}
        />
      )}

      {view === "complete" && (
        <CompleteScreen
          theme={appTheme}
          level={level}
          moves={moves}
          onHome={() => setView("home")}
          onNextLevel={handleNextFromComplete}
        />
      )}

      {view === "time-trial-result" && (
        <TimeTrialResultScreen
          solvedCount={timeTrialState.solvedCount}
          earnedCoins={timeTrialState.earnedCoins}
          nodeCount={timeTrialState.nodeCount}
          durationSeconds={timeTrialState.durationSeconds}
          onHome={() => setView("home")}
          onPlayAgain={() => setView("time-trial")}
        />
      )}

      {view === "settings" && (
        <SettingsScreen onBack={() => setView("home")} theme={appTheme} />
      )}

      {!noAdsOwned && (
        <View style={styles.bannerAdContainer}>
          <Text style={styles.bannerAdPlaceholder}>Banner Ad</Text>
        </View>
      )}

      <Modal transparent visible={popupAdVisible} animationType="fade">
        <View style={styles.popupAdOverlay}>
          <View style={styles.popupAdCard}>
            <Text style={styles.popupAdTag}>Example Video Ad</Text>
            <Text style={styles.popupAdTitle}>
              Your sponsor message goes here
            </Text>
            <Text style={styles.popupAdBody}>
              This is a placeholder for a future popup video ad.
            </Text>
            <View style={styles.popupAdVideoFrame}>
              <View style={styles.popupAdPlayButton} />
            </View>
            <Text style={styles.popupAdCountdown}>
              Closing in {popupAdSecondsLeft}s
            </Text>
          </View>
        </View>
      </Modal>
      {/* </SafeAreaView> */}
    </GestureHandlerRootView>
  );
}
