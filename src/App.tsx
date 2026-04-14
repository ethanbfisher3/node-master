import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  StatusBar,
  View,
  Text,
  Platform,
  Alert,
  Image,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Audio } from "expo-av";
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { PRE_GENERATED_LEVELS } from "./data/levels";
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
import * as NavigationBar from "expo-navigation-bar";
import cosmetics, {
  AppThemePalette,
  Cosmetic,
  THEME_PACKS,
  ThemePack,
  resolveAppTheme,
} from "./data/cosmetics";
import { createLevelPacks, LevelPack } from "./data/levelPacks";
import { GAME_HEIGHT, GAME_WIDTH, styles } from "./styles";
import {
  generateLevel,
  Link,
  Node,
  normalizeNodePositions,
  resolveNodePositionImmediate,
} from "./utils/gameLogic";
import { CoinPack } from "./data/coinPacks";
import { DEFAULT_SETTINGS, readSettings } from "./utils/settings";
import {
  DAILY_LEVEL_IDS,
  DEFAULT_CLASSIC_PACK_ID,
  MIN_LEVELS_BETWEEN_INTERSTITIAL_ADS,
  MIN_TIME_BETWEEN_INTERSTITIAL_ADS_MS,
  NO_ADS_ITEM_ID,
  NO_ADS_PRICE,
  NO_ADS_REVENUECAT_ID,
  PLAYER_PROGRESS_STORAGE_KEY,
  COMPLETED_LEVELS_STORAGE_KEY,
  POPUP_AD_DURATION_SECONDS,
  SOLVED_HOLD_DURATION_MS,
  WEEKLY_LEVEL_IDS,
} from "./app/constants";
import {
  findRevenueCatPackageByIdentifiers,
  resolveCoinPackPriceLabels,
  resolveLevelPackPriceLabels,
  resolveLocalizedPriceLabel,
  resolveThemePackPriceLabels,
} from "./app/revenueCat";
import {
  classicPackCompletionKey,
  completionKey,
  getCompletedLevelIdsForClassicPack,
  getCompletedLevelIdsForMode,
  readPlayerProgress,
  writePlayerProgress,
  type CompletionMode,
  type PersistedPlayerProgress,
} from "./app/progress";
import { getIntersectingLinkIds } from "./app/levelIntersections";
import { generateLevelForMode } from "./app/levelGeneration";

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

const LEVEL_COMPLETE_CELEBRATION_DELAY_MS = 1100;

type TimeTrialState = {
  nodeCount: number | null;
  durationSeconds: TrialDuration;
  timeLeftSeconds: number;
  active: boolean;
  solvedCount: number;
  earnedCoins: number;
};

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
  const [soundEnabled, setSoundEnabled] = useState(
    DEFAULT_SETTINGS.soundEnabled,
  );
  const [coinPackPriceLabels, setCoinPackPriceLabels] = useState<
    Record<string, string>
  >({});
  const [levelPackPriceLabels, setLevelPackPriceLabels] = useState<
    Record<string, string>
  >({});
  const [themePackPriceLabels, setThemePackPriceLabels] = useState<
    Record<string, string>
  >({});
  const [noAdsPriceLabel, setNoAdsPriceLabel] = useState<string | null>(null);
  const [purchaseCelebrationToken, setPurchaseCelebrationToken] = useState(0);
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
  const menuClickSoundRef = useRef<Audio.Sound | null>(null);
  const isMenuClickSoundLoadingRef = useRef(false);
  const themeChangeSoundRef = useRef<Audio.Sound | null>(null);
  const isThemeChangeSoundLoadingRef = useRef(false);
  const victorySoundRef = useRef<Audio.Sound | null>(null);
  const isVictorySoundLoadingRef = useRef(false);
  const generatedModeLevelsRef = useRef<
    Map<string, { nodes: Node[]; links: Link[] }>
  >(new Map());

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

  const requiredNodeCountByLevelId = useMemo(() => {
    const byLevelId = new Map<number, number>();
    for (const levelEntry of PRE_GENERATED_LEVELS) {
      byLevelId.set(levelEntry.id, levelEntry.nodes.length);
    }
    return byLevelId;
  }, []);

  useEffect(() => {
    const hideNavBar = async () => {
      NavigationBar.setVisibilityAsync("visible");
    };
    hideNavBar();
  }, []);

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
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return;
    }

    let cancelled = false;

    const loadCoinPackPriceLabels = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (cancelled) {
          return;
        }

        setCoinPackPriceLabels(resolveCoinPackPriceLabels(offerings));
        setLevelPackPriceLabels(
          resolveLevelPackPriceLabels(levelPacks, offerings),
        );
        setThemePackPriceLabels(resolveThemePackPriceLabels(offerings));
        setNoAdsPriceLabel(
          resolveLocalizedPriceLabel(offerings, NO_ADS_REVENUECAT_ID),
        );
      } catch {
        if (!cancelled) {
          setCoinPackPriceLabels({});
          setLevelPackPriceLabels({});
          setThemePackPriceLabels({});
          setNoAdsPriceLabel(null);
        }
      }
    };

    void loadCoinPackPriceLabels();

    return () => {
      cancelled = true;
    };
  }, [levelPacks]);

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
    let cancelled = false;

    const hydrateSettings = async () => {
      const nextSettings = await readSettings();
      if (cancelled) {
        return;
      }

      setSoundEnabled(nextSettings.soundEnabled);
    };

    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (view === "settings") {
      return;
    }

    let cancelled = false;

    const syncSettings = async () => {
      const nextSettings = await readSettings();
      if (cancelled) {
        return;
      }

      setSoundEnabled(nextSettings.soundEnabled);
    };

    void syncSettings();

    return () => {
      cancelled = true;
    };
  }, [view]);

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
      completedLevelKeys: Array.from(completedLevelKeys),
      completedLevelsCount,
      levelsSinceLastInterstitialAd,
      lastInterstitialAdAt,
    });
  }, [
    coins,
    completedLevelKeys,
    completedLevelsCount,
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

  useEffect(() => {
    if (!soundEnabled) {
      void menuClickSoundRef.current?.unloadAsync();
      menuClickSoundRef.current = null;
      return;
    }

    let cancelled = false;
    isMenuClickSoundLoadingRef.current = true;

    const preloadMenuClickSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require("./sounds/button_click.mp3"),
          {
            shouldPlay: false,
            volume: 0.55,
          },
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        await menuClickSoundRef.current?.unloadAsync();
        menuClickSoundRef.current = sound;
      } catch {
        if (!cancelled) {
          menuClickSoundRef.current = null;
        }
      } finally {
        isMenuClickSoundLoadingRef.current = false;
      }
    };

    void preloadMenuClickSound();

    return () => {
      cancelled = true;
      isMenuClickSoundLoadingRef.current = false;
      void menuClickSoundRef.current?.unloadAsync();
      menuClickSoundRef.current = null;
    };
  }, [soundEnabled]);

  const playMenuClickSound = useCallback(() => {
    if (!soundEnabled || isMenuClickSoundLoadingRef.current) {
      return;
    }

    const currentSound = menuClickSoundRef.current;
    if (!currentSound) {
      return;
    }

    void currentSound.replayAsync().catch(() => {
      // Ignore playback errors to keep navigation responsive.
    });
  }, [soundEnabled]);

  const withMenuClickSound = useCallback(
    <TArgs extends unknown[]>(callback: (...args: TArgs) => void) =>
      (...args: TArgs) => {
        playMenuClickSound();
        callback(...args);
      },
    [playMenuClickSound],
  );

  useEffect(() => {
    if (!soundEnabled) {
      void themeChangeSoundRef.current?.unloadAsync();
      themeChangeSoundRef.current = null;
      return;
    }

    let cancelled = false;
    isThemeChangeSoundLoadingRef.current = true;

    const preloadThemeChangeSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("./sounds/theme_change.mp3"),
          {
            shouldPlay: false,
            volume: 0.6,
          },
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        await themeChangeSoundRef.current?.unloadAsync();
        themeChangeSoundRef.current = sound;
      } catch {
        if (!cancelled) {
          themeChangeSoundRef.current = null;
        }
      } finally {
        isThemeChangeSoundLoadingRef.current = false;
      }
    };

    void preloadThemeChangeSound();

    return () => {
      cancelled = true;
      isThemeChangeSoundLoadingRef.current = false;
      void themeChangeSoundRef.current?.unloadAsync();
      themeChangeSoundRef.current = null;
    };
  }, [soundEnabled]);

  const playThemeChangeSound = useCallback(() => {
    if (!soundEnabled || isThemeChangeSoundLoadingRef.current) {
      return;
    }

    const currentSound = themeChangeSoundRef.current;
    if (!currentSound) {
      return;
    }

    void currentSound.replayAsync().catch(() => {
      // Ignore playback errors to keep UI interaction responsive.
    });
  }, [soundEnabled]);

  const withThemeChangeSound = useCallback(
    <TArgs extends unknown[]>(callback: (...args: TArgs) => void) =>
      (...args: TArgs) => {
        playThemeChangeSound();
        callback(...args);
      },
    [playThemeChangeSound],
  );

  useEffect(() => {
    if (!soundEnabled) {
      void victorySoundRef.current?.unloadAsync();
      victorySoundRef.current = null;
      return;
    }

    let cancelled = false;
    isVictorySoundLoadingRef.current = true;

    const preloadVictorySound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require("./sounds/victory.mp3"),
          {
            shouldPlay: false,
            volume: 0.7,
          },
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        await victorySoundRef.current?.unloadAsync();
        victorySoundRef.current = sound;
      } catch {
        if (!cancelled) {
          victorySoundRef.current = null;
        }
      } finally {
        isVictorySoundLoadingRef.current = false;
      }
    };

    void preloadVictorySound();

    return () => {
      cancelled = true;
      isVictorySoundLoadingRef.current = false;
      void victorySoundRef.current?.unloadAsync();
      victorySoundRef.current = null;
    };
  }, [soundEnabled]);

  const playVictorySound = useCallback(() => {
    if (!soundEnabled || isVictorySoundLoadingRef.current) {
      return;
    }

    const currentSound = victorySoundRef.current;
    if (!currentSound) {
      console.warn("Victory sound not loaded");
      return;
    }

    console.log("Playing victory sound");
    void currentSound
      .stopAsync()
      .then(() => {
        void currentSound.playAsync().catch(() => {});
      })
      .catch(() => {});
  }, [soundEnabled]);

  const handleRestoreAppInfo = useCallback(() => {
    if (!__DEV__) {
      return;
    }

    setLevel(1);
    setCoins(0);
    setNoAdsOwned(false);
    setPurchasedStoreItemIds(new Set<string>());
    setEquippedThemeCosmeticId(null);
    setSelectedLevelPackId(null);
    setCompletedLevelKeys(new Set<string>());
    setCompletedLevelsCount(0);
    setLevelsSinceLastInterstitialAd(0);
    setLastInterstitialAdAt(Date.now());
    setSessionLevelIds([]);
    setSessionIndex(0);
    generatedModeLevelsRef.current.clear();
    setTimeTrialState({
      nodeCount: null,
      durationSeconds: 30,
      timeLeftSeconds: 0,
      active: false,
      solvedCount: 0,
      earnedCoins: 0,
    });
    setPopupAdVisible(false);
    setPopupAdSecondsLeft(POPUP_AD_DURATION_SECONDS);
    setPendingPopupAdAction(null);
    clearCompletionHold();
    setIsLevelComplete(false);
    setView("home");
  }, [clearCompletionHold]);

  const loadLevel = useCallback(
    (levelId: number, mode: PlayMode, forcedTimeTrialNodeCount?: number) => {
      clearCompletionHold();
      const requiredNodeCount = requiredNodeCountByLevelId.get(levelId);
      const generatedLevel = generateLevelForMode({
        levelId,
        mode,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        generatedModeLevelsCache: generatedModeLevelsRef.current,
        selectedLevelPackId,
        forcedTimeTrialNodeCount,
        timeTrialNodeCount: timeTrialState.nodeCount,
        requiredNodeCount,
      });

      const nextNodes = generatedLevel.nodes;
      const nextLinks = generatedLevel.links;

      const normalizedNodes =
        mode === "time-trial"
          ? nextNodes
          : normalizeNodePositions(nextNodes, GAME_WIDTH, GAME_HEIGHT);

      setNodes(normalizedNodes);
      setLinks(nextLinks);
      setLevel(levelId);
      setIsLevelComplete(false);
      setPlayMode(mode);
      setView("game");
      checkIntersections(normalizedNodes, nextLinks, false);
    },
    [
      clearCompletionHold,
      requiredNodeCountByLevelId,
      selectedLevelPackId,
      timeTrialState.nodeCount,
    ],
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

    setView("complete");
  }, [advanceSessionAfterWin, playMode]);

  const handleWin = useCallback(() => {
    clearCompletionHold();
    setIsLevelComplete(true);
    playVictorySound();

    if (playMode === "time-trial") {
      setTimeTrialState((previous) => ({
        ...previous,
        solvedCount: previous.solvedCount + 1,
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

    const earned = 5 + nodes.length;
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
      setTimeout(() => {
        showPopupAd(continueAfterWin);
      }, LEVEL_COMPLETE_CELEBRATION_DELAY_MS);
      return;
    }

    setLevelsSinceLastInterstitialAd(nextAdEligibleLevelCount);

    setTimeout(() => {
      continueAfterWin();
    }, LEVEL_COMPLETE_CELEBRATION_DELAY_MS);
  }, [
    clearCompletionHold,
    completedLevelsCount,
    activeClassicPackId,
    continueAfterWin,
    lastInterstitialAdAt,
    level,
    nodes.length,
    playMode,
    noAdsOwned,
    levelsSinceLastInterstitialAd,
    showPopupAd,
    playVictorySound,
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

  const purchaseStoreItemByIdentifiers = useCallback(
    async (identifiers: string[]): Promise<boolean> => {
      if (Platform.OS !== "ios" && Platform.OS !== "android") {
        return false;
      }

      try {
        const offerings = await Purchases.getOfferings();
        const matchingPackage = findRevenueCatPackageByIdentifiers(
          offerings,
          identifiers,
        );

        if (!matchingPackage) {
          return false;
        }

        await Purchases.purchasePackage(matchingPackage);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const triggerPurchaseCelebration = useCallback(() => {
    setPurchaseCelebrationToken((previousToken) => previousToken + 1);
  }, []);

  const isCosmeticUnlocked = useCallback(
    (cosmeticId: string) => {
      const cosmeticItemKey = `cosmetic:${cosmeticId}`;
      if (purchasedStoreItemIds.has(cosmeticItemKey)) {
        return true;
      }

      return THEME_PACKS.some(
        (themePack) =>
          purchasedStoreItemIds.has(themePack.id) &&
          themePack.cosmeticIds.includes(cosmeticId),
      );
    },
    [purchasedStoreItemIds],
  );

  const handleBuyNoAds = useCallback(async () => {
    if (noAdsOwned) {
      return;
    }

    const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
      NO_ADS_REVENUECAT_ID,
      NO_ADS_ITEM_ID,
    ]);
    if (!purchaseSucceeded) {
      return;
    }

    setNoAdsOwned(true);
    setPurchasedStoreItemIds((previousOwnedItems) => {
      const nextOwnedItems = new Set(previousOwnedItems);
      nextOwnedItems.add(NO_ADS_ITEM_ID);
      return nextOwnedItems;
    });
    triggerPurchaseCelebration();
  }, [noAdsOwned, purchaseStoreItemByIdentifiers, triggerPurchaseCelebration]);

  const handleBuyCosmetic = useCallback(
    async (cosmetic: Cosmetic) => {
      const cosmeticItemKey = `cosmetic:${cosmetic.id}`;

      if (isCosmeticUnlocked(cosmetic.id)) {
        return;
      }

      if (cosmetic.priceType === "coins") {
        if (coins < cosmetic.price) {
          return;
        }

        setCoins((previousCoins) => previousCoins - cosmetic.price);
      } else {
        const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
          cosmetic.id,
        ]);
        if (!purchaseSucceeded) {
          return;
        }
      }

      setPurchasedStoreItemIds((previousOwnedItems) => {
        const nextOwnedItems = new Set(previousOwnedItems);
        nextOwnedItems.add(cosmeticItemKey);
        return nextOwnedItems;
      });
      triggerPurchaseCelebration();

      if (cosmetic.category === "app-theme") {
        setEquippedThemeCosmeticId(cosmetic.id);
      }
    },
    [
      coins,
      isCosmeticUnlocked,
      purchasedStoreItemIds,
      purchaseStoreItemByIdentifiers,
      triggerPurchaseCelebration,
    ],
  );

  const handleBuyLevelPack = useCallback(
    async (levelPack: LevelPack) => {
      const { storeItemId } = levelPack;
      const coinPrice = levelPack.price ?? 0;

      if (levelPack.defaultOwned || !storeItemId) {
        return;
      }

      if (purchasedStoreItemIds.has(storeItemId)) {
        return;
      }

      if (levelPack.priceType === "coins") {
        if (coins < coinPrice) {
          return;
        }

        setCoins((previousCoins) => previousCoins - coinPrice);
      } else {
        const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
          levelPack.id,
          storeItemId,
        ]);
        if (!purchaseSucceeded) {
          return;
        }
        Alert.alert(
          "Purchase successful!",
          `You have unlocked ${levelPack.name}!`,
        );
      }

      setPurchasedStoreItemIds((previousOwnedItems) => {
        const nextOwnedItems = new Set(previousOwnedItems);
        nextOwnedItems.add(storeItemId);
        return nextOwnedItems;
      });
      triggerPurchaseCelebration();
    },
    [
      coins,
      purchasedStoreItemIds,
      purchaseStoreItemByIdentifiers,
      triggerPurchaseCelebration,
    ],
  );

  const handleBuyCoinPack = useCallback(
    async (coinPack: CoinPack) => {
      const { storeItemId } = coinPack;
      if (!storeItemId) {
        return;
      }

      const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
        coinPack.id,
        storeItemId,
      ]);
      if (!purchaseSucceeded) {
        return;
      }

      setCoins((previousCoins) => previousCoins + coinPack.coins);
      triggerPurchaseCelebration();
      Alert.alert(
        "Purchase successful!",
        `You have received ${coinPack.coins} coins!`,
      );
    },
    [purchaseStoreItemByIdentifiers, triggerPurchaseCelebration],
  );

  const handleBuyThemePack = useCallback(
    async (themePack: ThemePack) => {
      if (purchasedStoreItemIds.has(themePack.id)) {
        return;
      }

      const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
        themePack.id,
      ]);
      if (!purchaseSucceeded) {
        return;
      }

      setPurchasedStoreItemIds((previousOwnedItems) => {
        const nextOwnedItems = new Set(previousOwnedItems);
        nextOwnedItems.add(themePack.id);
        return nextOwnedItems;
      });
      triggerPurchaseCelebration();
      Alert.alert(
        "Purchase successful!",
        `You have unlocked ${themePack.name}!`,
      );
    },
    [
      purchasedStoreItemIds,
      purchaseStoreItemByIdentifiers,
      triggerPurchaseCelebration,
    ],
  );

  const handleApplyDefaultTheme = useCallback(() => {
    setEquippedThemeCosmeticId(null);
  }, []);

  const handleApplyCosmetic = useCallback(
    (cosmetic: Cosmetic) => {
      if (!isCosmeticUnlocked(cosmetic.id)) {
        return;
      }

      if (cosmetic.category === "app-theme") {
        setEquippedThemeCosmeticId(cosmetic.id);
      }
    },
    [isCosmeticUnlocked],
  );

  const handleSelectLevelPack = useCallback((packId: string) => {
    setSelectedLevelPackId(packId);
    setView("levels");
  }, []);

  const appTextureSource = appTheme.appTextureSource ?? null;

  return (
    <GestureHandlerRootView
      style={[styles.root, { backgroundColor: appTheme.background }]}
    >
      {appTextureSource && (
        <Image
          source={appTextureSource}
          style={styles.textureBackground}
          resizeMode="cover"
        />
      )}
      {/* <SafeAreaView style={styles.container}> */}
      <StatusBar barStyle="dark-content" />

      {view === "home" && (
        <HomeScreen
          theme={appTheme}
          coins={coins}
          onSelectLevels={withMenuClickSound(() => setView("level-packs"))}
          onDailyWeekly={withMenuClickSound(() =>
            setView("daily-weekly-levels"),
          )}
          onTimeTrial={withMenuClickSound(() => setView("time-trial"))}
          onStore={withMenuClickSound(() => setView("store"))}
          onAdmin={
            __DEV__ ? withMenuClickSound(() => setView("admin")) : undefined
          }
          onRestoreAppInfo={
            __DEV__ ? withMenuClickSound(handleRestoreAppInfo) : undefined
          }
          onSettings={withMenuClickSound(() => setView("settings"))}
        />
      )}

      {view === "level-packs" && (
        <LevelPackScreen
          theme={appTheme}
          packs={levelPacksWithOwnership}
          onBack={withMenuClickSound(() => setView("home"))}
          goToStore={withMenuClickSound(() => setView("store"))}
          onSelectPack={withMenuClickSound(handleSelectLevelPack)}
        />
      )}

      {view === "admin" && __DEV__ && (
        <AdminScreen
          onBack={withMenuClickSound(() => setView("home"))}
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
          onBack={withMenuClickSound(() => setView("level-packs"))}
          onStartLevel={withMenuClickSound(startClassicLevel)}
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
              onStartLevel: withMenuClickSound(startDailyLevel),
              completedLevelIds: completedDailyLevelIds,
            },
            {
              title: "WEEKLY",
              levelIds: WEEKLY_LEVEL_IDS,
              onStartLevel: withMenuClickSound(startWeeklyLevel),
              completedLevelIds: completedWeeklyLevelIds,
            },
          ]}
          showNodeHeaders={false}
          onBack={withMenuClickSound(() => setView("home"))}
          onStartLevel={withMenuClickSound(startDailyLevel)}
        />
      )}

      {view === "time-trial" && (
        <TimeTrialScreen
          theme={appTheme}
          onBack={withMenuClickSound(() => setView("home"))}
          onStartTrial={withMenuClickSound(startTimeTrial)}
        />
      )}

      {view === "store" && (
        <StoreScreen
          theme={appTheme}
          coins={coins}
          noAdsOwned={noAdsOwned}
          noAdsPrice={NO_ADS_PRICE}
          noAdsPriceLabel={noAdsPriceLabel}
          cosmetics={cosmetics}
          levelPacks={levelPacksWithOwnership}
          purchasedStoreItemIds={purchasedStoreItemIds}
          equippedThemeCosmeticId={equippedThemeCosmeticId}
          onBack={withMenuClickSound(() => setView("home"))}
          onBuyNoAds={withMenuClickSound(handleBuyNoAds)}
          onBuyCosmetic={withMenuClickSound(handleBuyCosmetic)}
          onBuyThemePack={withMenuClickSound(handleBuyThemePack)}
          onBuyLevelPack={withMenuClickSound(handleBuyLevelPack)}
          onBuyCoinPack={withMenuClickSound(handleBuyCoinPack)}
          coinPackPriceLabels={coinPackPriceLabels}
          levelPackPriceLabels={levelPackPriceLabels}
          themePackPriceLabels={themePackPriceLabels}
          onApplyDefaultTheme={withThemeChangeSound(handleApplyDefaultTheme)}
          onApplyCosmetic={withThemeChangeSound(handleApplyCosmetic)}
          purchaseCelebrationToken={purchaseCelebrationToken}
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
          isLevelComplete={isLevelComplete}
          trialTimeLeftSeconds={
            playMode === "time-trial"
              ? timeTrialState.timeLeftSeconds
              : undefined
          }
          noAdsOwned={noAdsOwned}
          onBackHome={withMenuClickSound(() => setView("home"))}
          onOpenLevels={withMenuClickSound(() => {
            if (playMode === "daily" || playMode === "weekly") {
              setView("daily-weekly-levels");
              return;
            }
            if (playMode === "time-trial") {
              setView("time-trial");
              return;
            }
            setView("levels");
          })}
          onRestart={withMenuClickSound(handleRestart)}
          onNodeDrag={handleNodeDrag}
          onNodeDragEnd={handleNodeDragEnd}
        />
      )}

      {view === "complete" && (
        <CompleteScreen
          theme={appTheme}
          level={level}
          nodeCount={nodes.length}
          onHome={withMenuClickSound(() => setView("home"))}
          onNextLevel={withMenuClickSound(handleNextFromComplete)}
        />
      )}

      {view === "time-trial-result" && (
        <TimeTrialResultScreen
          solvedCount={timeTrialState.solvedCount}
          earnedCoins={timeTrialState.earnedCoins}
          nodeCount={timeTrialState.nodeCount}
          durationSeconds={timeTrialState.durationSeconds}
          onHome={withMenuClickSound(() => setView("home"))}
          onPlayAgain={withMenuClickSound(() => setView("time-trial"))}
        />
      )}

      {view === "settings" && (
        <SettingsScreen
          onBack={withMenuClickSound(() => setView("home"))}
          theme={appTheme}
        />
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
