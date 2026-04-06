import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, SafeAreaView, StatusBar, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { LevelData, PRE_GENERATED_LEVELS } from "./data/levels";
import { CompleteScreen } from "./screens/CompleteScreen";
import { GameScreen } from "./screens/GameScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LevelsScreen } from "./screens/LevelsScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { StoreScreen } from "./screens/StoreScreen";
import { TimeTrialResultScreen } from "./screens/TimeTrialResultScreen";
import { TimeTrialScreen } from "./screens/TimeTrialScreen";
import { GAME_HEIGHT, GAME_WIDTH, styles } from "./styles";
import { doIntersect } from "./utils/geometry";
import { storageGetItem, storageSetItem } from "./utils/appStorage";
import {
  generateLevel,
  Link,
  Node,
  normalizeNodePositions,
  resolveNodePosition,
} from "./utils/gameLogic";

type ViewType =
  | "home"
  | "admin"
  | "levels"
  | "daily-weekly-levels"
  | "time-trial"
  | "store"
  | "game"
  | "complete"
  | "time-trial-result";

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

const NO_ADS_PRICE = 500;
const POPUP_AD_DURATION_SECONDS = 5;
const DAILY_LEVEL_IDS = Array.from({ length: 10 }, (_, index) => index + 1);
const WEEKLY_LEVEL_IDS = Array.from({ length: 50 }, (_, index) => index + 1);
const PLAYER_PROGRESS_STORAGE_KEY = "node-master.player-progress";
const COMPLETED_LEVELS_STORAGE_KEY = "node-master.completed-levels";
const SOLVED_HOLD_DURATION_MS = 700;

type PersistedPlayerProgress = {
  level: number;
  coins: number;
  noAdsOwned: boolean;
  completedLevelIds: number[];
  completedLevelsCount: number;
};

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

function defaultPlayerProgress(): PersistedPlayerProgress {
  return {
    level: 1,
    coins: 0,
    noAdsOwned: false,
    completedLevelIds: [],
    completedLevelsCount: 0,
  };
}

async function readPlayerProgress(): Promise<PersistedPlayerProgress> {
  try {
    const rawValue = await storageGetItem(PLAYER_PROGRESS_STORAGE_KEY);
    if (!rawValue) {
      const legacyCompletedLevels = Array.from(
        await readLegacyCompletedLevels(),
      );
      return {
        ...defaultPlayerProgress(),
        completedLevelIds: legacyCompletedLevels,
        completedLevelsCount: legacyCompletedLevels.length,
      };
    }

    const parsedValue = JSON.parse(
      rawValue,
    ) as Partial<PersistedPlayerProgress>;
    const completedLevelIds = Array.isArray(parsedValue.completedLevelIds)
      ? parsedValue.completedLevelIds.filter(
          (value): value is number => typeof value === "number",
        )
      : [];

    return {
      level:
        typeof parsedValue.level === "number" && parsedValue.level > 0
          ? Math.floor(parsedValue.level)
          : 1,
      coins:
        typeof parsedValue.coins === "number" && parsedValue.coins >= 0
          ? Math.floor(parsedValue.coins)
          : 0,
      noAdsOwned: Boolean(parsedValue.noAdsOwned),
      completedLevelIds,
      completedLevelsCount:
        typeof parsedValue.completedLevelsCount === "number" &&
        parsedValue.completedLevelsCount >= 0
          ? Math.floor(parsedValue.completedLevelsCount)
          : completedLevelIds.length,
    };
  } catch {
    return defaultPlayerProgress();
  }
}

async function writePlayerProgress(
  progress: PersistedPlayerProgress,
): Promise<void> {
  try {
    await storageSetItem(PLAYER_PROGRESS_STORAGE_KEY, JSON.stringify(progress));

    // Keep the legacy key updated for backwards compatibility with old builds.
    await storageSetItem(
      COMPLETED_LEVELS_STORAGE_KEY,
      JSON.stringify(progress.completedLevelIds),
    );
  } catch {
    // Ignore storage failures; the game should remain playable.
  }
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed;

  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function getDailySeed(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return y * 10000 + m * 100 + d;
}

function getWeekSeed(date: Date): number {
  const copy = new Date(date);
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + mondayOffset);
  return getDailySeed(copy) * 7;
}

export default function App() {
  const [view, setView] = useState<ViewType>("home");
  const [playMode, setPlayMode] = useState<PlayMode>("classic");
  const [level, setLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [noAdsOwned, setNoAdsOwned] = useState(false);
  const [completedLevelIds, setCompletedLevelIds] = useState<Set<number>>(
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
      setCompletedLevelIds(new Set(progress.completedLevelIds));
      setCompletedLevelsCount(progress.completedLevelsCount);
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
      completedLevelIds: Array.from(completedLevelIds),
      completedLevelsCount,
    });
  }, [
    coins,
    completedLevelIds,
    completedLevelsCount,
    isProgressHydrated,
    level,
    noAdsOwned,
  ]);

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
    (levelId: number, mode: PlayMode) => {
      clearCompletionHold();
      let nextNodes: Node[] = [];
      let nextLinks: Link[] = [];

      if (mode === "daily" || mode === "weekly") {
        const cacheKey = `${mode}-${levelId}`;
        const cachedLevel = generatedModeLevelsRef.current.get(cacheKey);

        if (cachedLevel) {
          nextNodes = JSON.parse(JSON.stringify(cachedLevel.nodes));
          nextLinks = JSON.parse(JSON.stringify(cachedLevel.links));
        } else {
          const nodeCount = 7 + Math.floor(Math.random() * 7);
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
      } else {
        const levelData = levelById.get(levelId) ?? PRE_GENERATED_LEVELS[0];
        nextNodes = JSON.parse(JSON.stringify(levelData.nodes));
        nextLinks = JSON.parse(JSON.stringify(levelData.links));
      }

      const normalizedNodes = normalizeNodePositions(
        nextNodes,
        GAME_WIDTH,
        GAME_HEIGHT,
      );

      setNodes(normalizedNodes);
      setLinks(nextLinks);
      setLevel(levelId);
      setMoves(0);
      setIsLevelComplete(false);
      setPlayMode(mode);
      setView("game");
      checkIntersections(normalizedNodes, nextLinks, false);
    },
    [clearCompletionHold, levelById],
  );

  const startSession = useCallback(
    (mode: PlayMode, levelIds: number[]) => {
      if (levelIds.length === 0) {
        return;
      }
      setSessionLevelIds(levelIds);
      setSessionIndex(0);
      loadLevel(levelIds[0], mode);
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
      const seed = getDailySeed(new Date()) + duration;
      const matchingLevels = PRE_GENERATED_LEVELS.filter(
        (entry) => entry.nodes.length === nodeCount,
      ).map((entry) => entry.id);
      const ordered = seededShuffle(matchingLevels, seed);
      if (ordered.length === 0) {
        return;
      }

      setTimeTrialState({
        nodeCount,
        durationSeconds: duration,
        timeLeftSeconds: duration,
        active: true,
        solvedCount: 0,
        earnedCoins: 0,
      });
      startSession("time-trial", ordered);
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

    setCompletedLevelIds((previousCompletedLevels) => {
      const nextCompletedLevels = new Set(previousCompletedLevels);
      nextCompletedLevels.add(level);
      return nextCompletedLevels;
    });
    const nextCompletedLevels = completedLevelsCount + 1;
    setCompletedLevelsCount(nextCompletedLevels);

    const earned = level * 10 + Math.max(0, 50 - moves);
    setCoins((previousCoins) => previousCoins + earned);

    if (nextCompletedLevels % 6 === 0) {
      showPopupAd(continueAfterWin);
      return;
    }

    continueAfterWin();
  }, [
    clearCompletionHold,
    completedLevelsCount,
    continueAfterWin,
    level,
    moves,
    playMode,
    showPopupAd,
  ]);

  const checkIntersections = useCallback(
    (
      currentNodes: Node[],
      currentLinks: Link[],
      triggerWin: boolean = true,
    ) => {
      const intersections = new Set<string>();

      for (let i = 0; i < currentLinks.length; i++) {
        for (let j = i + 1; j < currentLinks.length; j++) {
          const firstLink = currentLinks[i];
          const secondLink = currentLinks[j];

          const firstNodeA = currentNodes.find(
            (node) => node.id === firstLink.node1Id,
          )!;
          const firstNodeB = currentNodes.find(
            (node) => node.id === firstLink.node2Id,
          )!;
          const secondNodeA = currentNodes.find(
            (node) => node.id === secondLink.node1Id,
          )!;
          const secondNodeB = currentNodes.find(
            (node) => node.id === secondLink.node2Id,
          )!;

          if (
            firstLink.node1Id === secondLink.node1Id ||
            firstLink.node1Id === secondLink.node2Id ||
            firstLink.node2Id === secondLink.node1Id ||
            firstLink.node2Id === secondLink.node2Id
          ) {
            continue;
          }

          if (doIntersect(firstNodeA, firstNodeB, secondNodeA, secondNodeB)) {
            intersections.add(firstLink.id);
            intersections.add(secondLink.id);
          }
        }
      }

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
        const nextNode = resolveNodePosition(
          id,
          x,
          y,
          previousNodes,
          GAME_WIDTH,
          GAME_HEIGHT,
        );
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
  }, [coins, noAdsOwned]);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* <SafeAreaView style={styles.container}> */}
      <StatusBar barStyle="dark-content" />

      {view === "home" && (
        <HomeScreen
          coins={coins}
          onSelectLevels={() => setView("levels")}
          onDailyWeekly={() => setView("daily-weekly-levels")}
          onTimeTrial={() => setView("time-trial")}
          onStore={() => setView("store")}
          onAdmin={__DEV__ ? () => setView("admin") : undefined}
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
          currentLevel={level}
          completedLevelIds={completedLevelIds}
          onBack={() => setView("home")}
          onStartLevel={startClassicLevel}
        />
      )}

      {view === "daily-weekly-levels" && (
        <LevelsScreen
          currentLevel={level}
          completedLevelIds={completedLevelIds}
          title="DAILY / WEEKLY"
          sections={[
            {
              title: "DAILY",
              levelIds: DAILY_LEVEL_IDS,
              onStartLevel: startDailyLevel,
            },
            {
              title: "WEEKLY",
              levelIds: WEEKLY_LEVEL_IDS,
              onStartLevel: startWeeklyLevel,
            },
          ]}
          showNodeHeaders={false}
          onBack={() => setView("home")}
          onStartLevel={startDailyLevel}
        />
      )}

      {view === "time-trial" && (
        <TimeTrialScreen
          onBack={() => setView("home")}
          onStartTrial={startTimeTrial}
        />
      )}

      {view === "store" && (
        <StoreScreen
          coins={coins}
          noAdsOwned={noAdsOwned}
          noAdsPrice={NO_ADS_PRICE}
          onBack={() => setView("home")}
          onBuyNoAds={handleBuyNoAds}
        />
      )}

      {view === "game" && (
        <GameScreen
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
          onBackHome={() => setView("home")}
          onOpenLevels={() => setView("levels")}
          onRestart={handleRestart}
          onNodeDrag={handleNodeDrag}
        />
      )}

      {view === "complete" && (
        <CompleteScreen
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
          onHome={() => setView("home")}
          onPlayAgain={() => setView("time-trial")}
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
