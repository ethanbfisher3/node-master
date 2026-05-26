import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Image,
  Modal,
  Platform,
  StatusBar,
  Text,
  View,
} from "react-native"
import {
  NavigationContainer,
  StackActions,
  createNavigationContainerRef,
} from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import Purchases, { LOG_LEVEL } from "react-native-purchases"
import { PRE_GENERATED_LEVELS } from "./data/levels"
import { BannerAdSlot } from "./components/BannerAdSlot"
import Constants from "expo-constants"
import {
  AppThemePalette,
  Cosmetic,
  THEME_PACKS,
  ThemePack,
  resolveAppTheme,
} from "./data/cosmetics"
import { createLevelPacks, LevelPack } from "./data/levelPacks"
import { GAME_HEIGHT, GAME_WIDTH, styles } from "./styles"
import {
  Link,
  Node,
  normalizeNodePositions,
  resolveNodePositionImmediate,
} from "./utils/gameLogic"
import { DEFAULT_SETTINGS, readSettings } from "./utils/settings"
import { useIsOffline } from "./utils/useIsOffline"
import {
  DAILY_LEVEL_IDS,
  DEFAULT_CLASSIC_PACK_ID,
  MIN_LEVELS_BETWEEN_INTERSTITIAL_ADS,
  MIN_TIME_BETWEEN_INTERSTITIAL_ADS_MS,
  NO_ADS_ITEM_ID,
  NO_ADS_REVENUECAT_ID,
  REVERSE_LEVEL_PACK_ID,
  POPUP_AD_DURATION_SECONDS,
  SOLVED_HOLD_DURATION_MS,
  WEEKLY_LEVEL_IDS,
} from "./app/constants"
import { AppScreens } from "./app/AppScreens"
import {
  findRevenueCatPackageByIdentifiers,
  resolveLevelPackPriceLabels,
  resolveLocalizedPriceLabel,
  resolveThemePackPriceLabels,
} from "./app/revenueCat"
import {
  classicPackCompletionKey,
  filterCompletedLevelKeysForMode,
  completionKey,
  getCurrentChallengeResetKeys,
  getCompletedLevelIdsForClassicPack,
  getCompletedLevelIdsForMode,
  readPlayerProgress,
  writePlayerProgress,
  type CompletionMode,
} from "./app/progress"
import { getIntersectingLinkIds } from "./app/levelIntersections"
import { generateLevelForMode } from "./app/levelGeneration"
import { useSoundEffects } from "./app/useSoundEffects"
import type { ViewStackMode } from "./app/useViewStack"
import type {
  PlayMode,
  TimeTrialState,
  TrialDuration,
  ViewType,
} from "./app/types"
import { TestIds } from "react-native-google-mobile-ads"

const LEVEL_COMPLETE_CELEBRATION_DELAY_MS = 1100
const VIDEO_AD_LOAD_TIMEOUT_MS = 5000
const videoAdUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === "android"
    ? "ca-app-pub-9592701510571371/5138213006"
    : Platform.OS === "ios"
      ? "ca-app-pub-9592701510571371/8885936656"
      : null

type RootStackParamList = Record<ViewType, undefined>

const Stack = createNativeStackNavigator<RootStackParamList>()
const navigationRef = createNavigationContainerRef<RootStackParamList>()

export default function App() {
  const isExpoGo = __DEV__ || Constants.executionEnvironment === "storeClient"
  const shouldEnableAds = !isExpoGo
  const isOffline = useIsOffline()
  const [view, setCurrentView] = useState<ViewType>("home")
  const [playMode, setPlayMode] = useState<PlayMode>("classic")
  const [level, setLevel] = useState(1)
  const [coins, setCoins] = useState(1000)
  const [noAdsOwned, setNoAdsOwned] = useState(false)
  const [purchasedStoreItemIds, setPurchasedStoreItemIds] = useState<
    Set<string>
  >(new Set())
  const [equippedThemeCosmeticId, setEquippedThemeCosmeticId] = useState<
    string | null
  >(null)
  const [selectedLevelPackId, setSelectedLevelPackId] = useState<string | null>(
    null,
  )
  const [completedLevelKeys, setCompletedLevelKeys] = useState<Set<string>>(
    new Set(),
  )
  const [dailyChallengeResetKey, setDailyChallengeResetKey] = useState("")
  const [weeklyChallengeResetKey, setWeeklyChallengeResetKey] = useState("")
  const [nodes, setNodes] = useState<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [intersectingLinks, setIntersectingLinks] = useState<Set<string>>(
    new Set(),
  )
  const [isLevelComplete, setIsLevelComplete] = useState(false)
  const [completedLevelsCount, setCompletedLevelsCount] = useState(0)
  const [levelsSinceLastInterstitialAd, setLevelsSinceLastInterstitialAd] =
    useState(0)
  const [lastInterstitialAdAt, setLastInterstitialAdAt] = useState<
    number | null
  >(null)
  const [isProgressHydrated, setIsProgressHydrated] = useState(false)
  const [sessionLevelIds, setSessionLevelIds] = useState<number[]>([])
  const [sessionIndex, setSessionIndex] = useState(0)
  const [popupAdVisible, setPopupAdVisible] = useState(false)
  const [popupAdSecondsLeft, setPopupAdSecondsLeft] = useState(
    POPUP_AD_DURATION_SECONDS,
  )
  const [isNodeDragLocked, setIsNodeDragLocked] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(
    DEFAULT_SETTINGS.soundEnabled,
  )
  const [levelPackPriceLabels, setLevelPackPriceLabels] = useState<
    Record<string, string>
  >({})
  const [themePackPriceLabels, setThemePackPriceLabels] = useState<
    Record<string, string>
  >({})
  const [noAdsPriceLabel, setNoAdsPriceLabel] = useState<string | null>(null)
  const [purchaseCelebrationToken, setPurchaseCelebrationToken] = useState(0)
  const [pendingPopupAdAction, setPendingPopupAdAction] = useState<
    (() => void) | null
  >(null)
  const [adsModule, setAdsModule] = useState<
    typeof import("react-native-google-mobile-ads") | null
  >(null)
  const [timeTrialState, setTimeTrialState] = useState<TimeTrialState>({
    nodeCount: null,
    durationSeconds: 30,
    timeLeftSeconds: 0,
    active: false,
    solvedCount: 0,
    earnedCoins: 0,
  })
  const completionHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const generatedModeLevelsRef = useRef<
    Map<string, { nodes: Node[]; links: Link[] }>
  >(new Map())
  const activeDragNodeIdsRef = useRef<Set<string>>(new Set())

  const { playVictorySound, withMenuClickSound, withThemeChangeSound } =
    useSoundEffects(soundEnabled)

  const popToView = useCallback((nextView: ViewType) => {
    if (!navigationRef.isReady()) {
      return false
    }

    const state = navigationRef.getRootState()
    if (!state) {
      return false
    }

    const currentIndex = state.index ?? state.routes.length - 1
    const targetIndex = state.routes
      .map((route) => route.name)
      .lastIndexOf(nextView)

    if (targetIndex < 0) {
      return false
    }

    const popCount = currentIndex - targetIndex
    if (popCount <= 0) {
      return true
    }

    navigationRef.dispatch(StackActions.pop(popCount))
    return true
  }, [])

  const setView = useCallback(
    (nextView: ViewType, mode: ViewStackMode = "auto") => {
      if (!navigationRef.isReady()) {
        return
      }

      switch (mode) {
        case "reset":
          navigationRef.reset({
            index: 0,
            routes: [{ name: nextView }],
          })
          return
        case "replace":
          navigationRef.dispatch(StackActions.replace(nextView))
          return
        case "push":
          navigationRef.dispatch(StackActions.push(nextView))
          return
        case "popTo":
          if (!popToView(nextView)) {
            navigationRef.navigate(nextView)
          }
          return
        default:
          if (!popToView(nextView)) {
            navigationRef.navigate(nextView)
          }
          return
      }
    },
    [popToView],
  )

  const handleNavStateChange = useCallback(() => {
    const route = navigationRef.getCurrentRoute()
    if (!route) {
      return
    }

    setCurrentView(route.name as ViewType)
  }, [])

  const levelPacks = useMemo<LevelPack[]>(
    () => createLevelPacks(PRE_GENERATED_LEVELS.length),
    [],
  )

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
  )

  const selectedLevelPack = useMemo(() => {
    if (!levelPacksWithOwnership.length) {
      return null
    }

    const explicit = levelPacksWithOwnership.find(
      (pack) => pack.id === selectedLevelPackId,
    )
    if (explicit) {
      return explicit
    }

    return levelPacksWithOwnership.find((pack) => pack.owned) ?? null
  }, [levelPacksWithOwnership, selectedLevelPackId])

  const requiredNodeCountByLevelId = useMemo(() => {
    const byLevelId = new Map<number, number>()
    for (const levelEntry of PRE_GENERATED_LEVELS) {
      byLevelId.set(levelEntry.id, levelEntry.nodes.length)
    }
    return byLevelId
  }, [])

  useEffect(() => {
    if (!shouldEnableAds) {
      setAdsModule(null)
      return
    }

    let cancelled = false

    const initializeAds = async () => {
      try {
        const module = await import("react-native-google-mobile-ads")
        const { default: MobileAds } = module

        if (cancelled) {
          return
        }

        setAdsModule(module)

        const adapterStatuses = await MobileAds().initialize()
        console.log("Mobile Ads initialized:", adapterStatuses)
      } catch (error) {
        if (!cancelled) {
          setAdsModule(null)
        }
        console.warn("Failed to initialize Mobile Ads:", error)
      }
    }

    void initializeAds()

    return () => {
      cancelled = true
    }
  }, [shouldEnableAds])

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE)
    const revenueCatApiKey = isExpoGo
      ? Constants.expoConfig?.extra?.revenueCatApiKeyTestStore
      : Platform.OS === "ios"
        ? Constants.expoConfig?.extra?.revenueCatApiKeyApple
        : Platform.OS === "android"
          ? Constants.expoConfig?.extra?.revenueCatApiKeyGoogle
          : undefined

    if (!revenueCatApiKey) {
      console.warn(
        "RevenueCat API key is missing for the current environment/platform.",
      )
      return
    }

    Purchases.configure({
      apiKey: revenueCatApiKey,
    })

    console.log("Purchases configured")
  }, [isExpoGo])

  useEffect(() => {
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return
    }

    let cancelled = false

    const loadStorePriceLabels = async () => {
      try {
        const offerings = await Purchases.getOfferings()
        if (cancelled) {
          return
        }

        setLevelPackPriceLabels(
          resolveLevelPackPriceLabels(levelPacks, offerings),
        )
        setThemePackPriceLabels(resolveThemePackPriceLabels(offerings))
        setNoAdsPriceLabel(
          resolveLocalizedPriceLabel(offerings, NO_ADS_REVENUECAT_ID),
        )
      } catch {
        if (!cancelled) {
          setLevelPackPriceLabels({})
          setThemePackPriceLabels({})
          setNoAdsPriceLabel(null)
        }
      }
    }

    void loadStorePriceLabels()

    return () => {
      cancelled = true
    }
  }, [levelPacks])

  useEffect(() => {
    let cancelled = false

    const hydrateProgress = async () => {
      const progress = await readPlayerProgress()
      if (cancelled) {
        return
      }

      setLevel(progress.level)
      setCoins(progress.coins)
      setNoAdsOwned(progress.noAdsOwned)
      setPurchasedStoreItemIds(new Set(progress.purchasedStoreItemIds))
      setEquippedThemeCosmeticId(progress.equippedThemeCosmeticId)
      setCompletedLevelKeys(new Set(progress.completedLevelKeys))
      setDailyChallengeResetKey(progress.dailyChallengeResetKey)
      setWeeklyChallengeResetKey(progress.weeklyChallengeResetKey)
      setCompletedLevelsCount(progress.completedLevelsCount)
      setLevelsSinceLastInterstitialAd(progress.levelsSinceLastInterstitialAd)
      setLastInterstitialAdAt(progress.lastInterstitialAdAt ?? Date.now())
      setIsProgressHydrated(true)
    }

    void hydrateProgress()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const hydrateSettings = async () => {
      const nextSettings = await readSettings()
      if (cancelled) {
        return
      }

      setSoundEnabled(nextSettings.soundEnabled)
    }

    void hydrateSettings()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (view === "settings") {
      return
    }

    let cancelled = false

    const syncSettings = async () => {
      const nextSettings = await readSettings()
      if (cancelled) {
        return
      }

      setSoundEnabled(nextSettings.soundEnabled)
    }

    void syncSettings()

    return () => {
      cancelled = true
    }
  }, [view])

  useEffect(() => {
    if (!isProgressHydrated) {
      return
    }

    void writePlayerProgress({
      level,
      coins,
      noAdsOwned,
      purchasedStoreItemIds: Array.from(purchasedStoreItemIds),
      equippedThemeCosmeticId,
      completedLevelKeys: Array.from(completedLevelKeys),
      dailyChallengeResetKey,
      weeklyChallengeResetKey,
      completedLevelsCount,
      levelsSinceLastInterstitialAd,
      lastInterstitialAdAt,
    })
  }, [
    coins,
    completedLevelKeys,
    completedLevelsCount,
    equippedThemeCosmeticId,
    isProgressHydrated,
    level,
    noAdsOwned,
    purchasedStoreItemIds,
    dailyChallengeResetKey,
    lastInterstitialAdAt,
    levelsSinceLastInterstitialAd,
    weeklyChallengeResetKey,
  ])

  const appTheme = useMemo<AppThemePalette>(
    () => resolveAppTheme(equippedThemeCosmeticId),
    [equippedThemeCosmeticId],
  )

  const activeClassicPackId = selectedLevelPack?.id ?? DEFAULT_CLASSIC_PACK_ID
  const isReverseClassicPackActive =
    playMode === "classic" && activeClassicPackId === REVERSE_LEVEL_PACK_ID

  const completedClassicLevelIds = useMemo(
    () =>
      getCompletedLevelIdsForClassicPack(
        completedLevelKeys,
        activeClassicPackId,
      ),
    [activeClassicPackId, completedLevelKeys],
  )

  const completedDailyLevelIds = useMemo(
    () => getCompletedLevelIdsForMode(completedLevelKeys, "daily"),
    [completedLevelKeys],
  )

  const completedWeeklyLevelIds = useMemo(
    () => getCompletedLevelIdsForMode(completedLevelKeys, "weekly"),
    [completedLevelKeys],
  )

  const clearCompletionHold = useCallback(() => {
    if (!completionHoldTimeoutRef.current) {
      return
    }

    clearTimeout(completionHoldTimeoutRef.current)
    completionHoldTimeoutRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      clearCompletionHold()
    }
  }, [clearCompletionHold])

  const handleRestoreAppInfo = useCallback(() => {
    if (!__DEV__) {
      return
    }

    setLevel(1)
    setCoins(0)
    setNoAdsOwned(false)
    setPurchasedStoreItemIds(new Set<string>())
    setEquippedThemeCosmeticId(null)
    setSelectedLevelPackId(null)
    setCompletedLevelKeys(new Set<string>())
    const resetChallengeKeys = getCurrentChallengeResetKeys()
    setDailyChallengeResetKey(resetChallengeKeys.dailyChallengeResetKey)
    setWeeklyChallengeResetKey(resetChallengeKeys.weeklyChallengeResetKey)
    setCompletedLevelsCount(0)
    setLevelsSinceLastInterstitialAd(0)
    setLastInterstitialAdAt(Date.now())
    setSessionLevelIds([])
    setSessionIndex(0)
    generatedModeLevelsRef.current.clear()
    setTimeTrialState({
      nodeCount: null,
      durationSeconds: 30,
      timeLeftSeconds: 0,
      active: false,
      solvedCount: 0,
      earnedCoins: 0,
    })
    setPopupAdVisible(false)
    setPopupAdSecondsLeft(POPUP_AD_DURATION_SECONDS)
    setPendingPopupAdAction(null)
    clearCompletionHold()
    activeDragNodeIdsRef.current.clear()
    setIsNodeDragLocked(false)
    setIsLevelComplete(false)
    setView("home")
  }, [clearCompletionHold])

  const loadLevel = useCallback(
    (levelId: number, mode: PlayMode, forcedTimeTrialNodeCount?: number) => {
      clearCompletionHold()
      const requiredNodeCount = requiredNodeCountByLevelId.get(levelId)
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
      })

      const nextNodes = generatedLevel.nodes
      const nextLinks = generatedLevel.links

      const normalizedNodes =
        mode === "time-trial"
          ? nextNodes
          : normalizeNodePositions(nextNodes, GAME_WIDTH, GAME_HEIGHT)

      setNodes(normalizedNodes)
      setLinks(nextLinks)
      setLevel(levelId)
      activeDragNodeIdsRef.current.clear()
      setIsNodeDragLocked(false)
      setIsLevelComplete(false)
      setPlayMode(mode)
      setView("game")
      checkIntersections(normalizedNodes, nextLinks, false)
    },
    [
      clearCompletionHold,
      requiredNodeCountByLevelId,
      selectedLevelPackId,
      timeTrialState.nodeCount,
    ],
  )

  const startSession = useCallback(
    (mode: PlayMode, levelIds: number[], forcedTimeTrialNodeCount?: number) => {
      if (levelIds.length === 0) {
        return
      }
      setSessionLevelIds(levelIds)
      setSessionIndex(0)
      loadLevel(levelIds[0], mode, forcedTimeTrialNodeCount)
    },
    [loadLevel],
  )

  const startClassicLevel = useCallback(
    (levelId: number) => {
      setSessionLevelIds([])
      setSessionIndex(0)
      loadLevel(levelId, "classic")
    },
    [loadLevel],
  )

  const startDailyLevel = useCallback(
    (levelId: number) => {
      const levelIndex = DAILY_LEVEL_IDS.indexOf(levelId)
      if (levelIndex < 0) {
        return
      }

      setSessionLevelIds(DAILY_LEVEL_IDS)
      setSessionIndex(levelIndex)
      loadLevel(levelId, "daily")
    },
    [loadLevel],
  )

  const startWeeklyLevel = useCallback(
    (levelId: number) => {
      const levelIndex = WEEKLY_LEVEL_IDS.indexOf(levelId)
      if (levelIndex < 0) {
        return
      }

      setSessionLevelIds(WEEKLY_LEVEL_IDS)
      setSessionIndex(levelIndex)
      loadLevel(levelId, "weekly")
    },
    [loadLevel],
  )

  const startTimeTrial = useCallback(
    (nodeCount: number, duration: TrialDuration) => {
      const ordered = Array.from(
        { length: Math.max(PRE_GENERATED_LEVELS.length, 20) },
        (_, index) => index + 1,
      )

      setTimeTrialState({
        nodeCount,
        durationSeconds: duration,
        timeLeftSeconds: duration,
        active: true,
        solvedCount: 0,
        earnedCoins: 0,
      })
      startSession("time-trial", ordered, nodeCount)
    },
    [startSession],
  )

  useEffect(() => {
    if (!popupAdVisible) {
      return
    }

    if (popupAdSecondsLeft <= 0) {
      const nextAction = pendingPopupAdAction
      setPopupAdVisible(false)
      setPopupAdSecondsLeft(POPUP_AD_DURATION_SECONDS)
      setPendingPopupAdAction(null)
      nextAction?.()
      return
    }

    const timeoutId = setTimeout(() => {
      setPopupAdSecondsLeft((previousSeconds) => previousSeconds - 1)
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [pendingPopupAdAction, popupAdSecondsLeft, popupAdVisible])

  const showPopupAd = useCallback(
    (nextAction: () => void) => {
      if (noAdsOwned) {
        nextAction()
        return
      }

      // If offline, don't attempt video ads — just continue
      if (isOffline) {
        nextAction()
        return
      }

      const showFallbackPopup = () => {
        setPopupAdSecondsLeft(POPUP_AD_DURATION_SECONDS)
        setPendingPopupAdAction(() => nextAction)
        setPopupAdVisible(true)
      }

      if (isExpoGo || !shouldEnableAds || !videoAdUnitId || !adsModule) {
        // No ad available in this environment — skip showing any popup ad
        nextAction()
        return
      }

      const { InterstitialAd, AdEventType } = adsModule

      try {
        const interstitialAd = InterstitialAd.createForAdRequest(videoAdUnitId)
        let handled = false
        let displayed = false
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        const finalize = (callback: () => void) => {
          if (handled) {
            return
          }
          handled = true
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
          unsubscribeLoaded()
          unsubscribeClosed()
          unsubscribeError()
          callback()
        }

        const unsubscribeLoaded = interstitialAd.addAdEventListener(
          AdEventType.LOADED,
          () => {
            displayed = true
            void interstitialAd.show().catch((err: any) => {
              console.warn("Interstitial show failed", err)
              finalize(nextAction)
            })
          },
        )

        const unsubscribeClosed = interstitialAd.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            finalize(nextAction)
          },
        )

        const unsubscribeError = interstitialAd.addAdEventListener(
          AdEventType.ERROR,
          (err) => {
            console.warn("Interstitial error", err)
            // On error, proceed — don't show fallback video popup
            finalize(nextAction)
          },
        )

        timeoutId = setTimeout(() => {
          finalize(nextAction)
        }, VIDEO_AD_LOAD_TIMEOUT_MS)

        interstitialAd.load()
      } catch {
        showFallbackPopup()
      }
    },
    [
      adsModule,
      isExpoGo,
      isOffline,
      noAdsOwned,
      shouldEnableAds,
      videoAdUnitId,
    ],
  )

  const endTimeTrial = useCallback(() => {
    showPopupAd(() => {
      setTimeTrialState((previous) => ({ ...previous, active: false }))
      setView("time-trial-result")
    })
  }, [showPopupAd])

  const advanceSessionAfterWin = useCallback(() => {
    if (playMode === "classic") {
      setView("complete")
      return
    }

    if (playMode === "time-trial") {
      if (sessionLevelIds.length === 0) {
        return
      }
      const nextIndex = (sessionIndex + 1) % sessionLevelIds.length
      setSessionIndex(nextIndex)
      loadLevel(sessionLevelIds[nextIndex], "time-trial")
      return
    }

    setView("complete")
  }, [loadLevel, playMode, sessionIndex, sessionLevelIds])

  const continueAfterWin = useCallback(() => {
    if (playMode === "time-trial") {
      setTimeout(() => {
        setIsLevelComplete(false)
        advanceSessionAfterWin()
      }, 250)
      return
    }

    setView("complete")
  }, [advanceSessionAfterWin, playMode])

  const handleWin = useCallback(() => {
    clearCompletionHold()
    setIsLevelComplete(true)
    if (activeDragNodeIdsRef.current.size === 0) {
      setIsNodeDragLocked(true)
    }
    playVictorySound()

    if (playMode === "time-trial") {
      setTimeTrialState((previous) => ({
        ...previous,
        solvedCount: previous.solvedCount + 1,
      }))

      continueAfterWin()
      return
    }

    const modeForCompletion: CompletionMode =
      playMode === "daily" || playMode === "weekly" ? playMode : "classic"
    const levelCompletionKey =
      modeForCompletion === "classic"
        ? classicPackCompletionKey(activeClassicPackId, level)
        : completionKey(modeForCompletion, level)
    const didCompleteNewLevel = !completedLevelKeys.has(levelCompletionKey)

    if (didCompleteNewLevel) {
      setCompletedLevelKeys((previousCompletedLevels) => {
        const nextCompletedLevels = new Set(previousCompletedLevels)
        nextCompletedLevels.add(levelCompletionKey)
        return nextCompletedLevels
      })
    }

    const nextCompletedLevels = didCompleteNewLevel
      ? completedLevelsCount + 1
      : completedLevelsCount
    if (didCompleteNewLevel) {
      setCompletedLevelsCount(nextCompletedLevels)
    }

    // const earned = 5 + nodes.length;
    // setCoins((previousCoins) => previousCoins + earned);

    const now = Date.now()
    const nextAdEligibleLevelCount = levelsSinceLastInterstitialAd + 1
    const hasEnoughLevels =
      nextAdEligibleLevelCount >= MIN_LEVELS_BETWEEN_INTERSTITIAL_ADS
    const hasCooldownElapsed =
      lastInterstitialAdAt === null ||
      now - lastInterstitialAdAt >= MIN_TIME_BETWEEN_INTERSTITIAL_ADS_MS

    if (!noAdsOwned && hasEnoughLevels && hasCooldownElapsed) {
      setLevelsSinceLastInterstitialAd(0)
      setLastInterstitialAdAt(now)
      setTimeout(() => {
        showPopupAd(continueAfterWin)
      }, LEVEL_COMPLETE_CELEBRATION_DELAY_MS)
      return
    }

    setLevelsSinceLastInterstitialAd(nextAdEligibleLevelCount)

    setTimeout(() => {
      continueAfterWin()
    }, LEVEL_COMPLETE_CELEBRATION_DELAY_MS)
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
  ])

  const checkIntersections = useCallback(
    (
      currentNodes: Node[],
      currentLinks: Link[],
      triggerWin: boolean = true,
    ) => {
      const intersections = getIntersectingLinkIds(currentNodes, currentLinks)

      setIntersectingLinks(intersections)

      if (!triggerWin || currentLinks.length === 0) {
        clearCompletionHold()
        return
      }

      const isWinConditionMet = isReverseClassicPackActive
        ? intersections.size === currentLinks.length
        : intersections.size === 0

      if (!isWinConditionMet) {
        clearCompletionHold()
        if (isLevelComplete) {
          setIsLevelComplete(false)
        }
        return
      }

      if (!isLevelComplete && !completionHoldTimeoutRef.current) {
        completionHoldTimeoutRef.current = setTimeout(() => {
          completionHoldTimeoutRef.current = null
          handleWin()
        }, SOLVED_HOLD_DURATION_MS)
      }
    },
    [
      clearCompletionHold,
      handleWin,
      isLevelComplete,
      isReverseClassicPackActive,
    ],
  )

  useEffect(() => {
    if (!isProgressHydrated) {
      return
    }

    const syncChallengeProgress = () => {
      const currentResetKeys = getCurrentChallengeResetKeys()
      let nextCompletedLevelKeys = completedLevelKeys
      let didResetDaily = false
      let didResetWeekly = false

      if (dailyChallengeResetKey !== currentResetKeys.dailyChallengeResetKey) {
        nextCompletedLevelKeys = filterCompletedLevelKeysForMode(
          nextCompletedLevelKeys,
          "daily",
        )
        didResetDaily = true
      }

      if (
        weeklyChallengeResetKey !== currentResetKeys.weeklyChallengeResetKey
      ) {
        nextCompletedLevelKeys = filterCompletedLevelKeysForMode(
          nextCompletedLevelKeys,
          "weekly",
        )
        didResetWeekly = true
      }

      if (!didResetDaily && !didResetWeekly) {
        return
      }

      setCompletedLevelKeys(nextCompletedLevelKeys)
      setCompletedLevelsCount(nextCompletedLevelKeys.size)
      setDailyChallengeResetKey(currentResetKeys.dailyChallengeResetKey)
      setWeeklyChallengeResetKey(currentResetKeys.weeklyChallengeResetKey)
    }

    syncChallengeProgress()

    const timerId = setInterval(syncChallengeProgress, 60 * 1000)

    return () => {
      clearInterval(timerId)
    }
  }, [
    completedLevelKeys,
    dailyChallengeResetKey,
    isProgressHydrated,
    weeklyChallengeResetKey,
  ])

  useEffect(() => {
    if (
      view !== "game" ||
      playMode !== "time-trial" ||
      !timeTrialState.active
    ) {
      return
    }

    const timerId = setInterval(() => {
      setTimeTrialState((previous) => {
        if (!previous.active) {
          return previous
        }
        if (previous.timeLeftSeconds <= 1) {
          return { ...previous, timeLeftSeconds: 0, active: false }
        }
        return { ...previous, timeLeftSeconds: previous.timeLeftSeconds - 1 }
      })
    }, 1000)

    return () => {
      clearInterval(timerId)
    }
  }, [playMode, timeTrialState.active, view])

  useEffect(() => {
    if (
      playMode === "time-trial" &&
      view === "game" &&
      !timeTrialState.active &&
      timeTrialState.timeLeftSeconds === 0 &&
      !popupAdVisible &&
      !pendingPopupAdAction
    ) {
      endTimeTrial()
    }
  }, [
    endTimeTrial,
    pendingPopupAdAction,
    playMode,
    popupAdVisible,
    timeTrialState.active,
    timeTrialState.timeLeftSeconds,
    view,
  ])

  const handleNodeDrag = useCallback(
    (id: string, x: number, y: number) => {
      if (isNodeDragLocked) {
        return
      }

      setNodes((previousNodes) => {
        const nextNode = { id, x, y }
        const nextNodes = previousNodes.map((node) =>
          node.id === id ? nextNode : node,
        )
        checkIntersections(nextNodes, links)
        return nextNodes
      })
    },
    [checkIntersections, isNodeDragLocked, links],
  )

  const handleNodeDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      if (isNodeDragLocked) {
        return
      }

      setNodes((previousNodes) => {
        const snappedNode = resolveNodePositionImmediate(
          id,
          x,
          y,
          previousNodes,
          GAME_WIDTH,
          GAME_HEIGHT,
        )
        const nextNodes = previousNodes.map((node) =>
          node.id === id ? snappedNode : node,
        )
        checkIntersections(nextNodes, links)
        return nextNodes
      })

      if (isLevelComplete && activeDragNodeIdsRef.current.size === 0) {
        setIsNodeDragLocked(true)
      }
    },
    [checkIntersections, isLevelComplete, isNodeDragLocked, links],
  )

  const handleNodeDragStart = useCallback(
    (id: string) => {
      if (isNodeDragLocked) {
        return
      }

      activeDragNodeIdsRef.current.add(id)
    },
    [isNodeDragLocked],
  )

  const handleNodeDragFinalize = useCallback(
    (id: string) => {
      activeDragNodeIdsRef.current.delete(id)

      if (isLevelComplete && activeDragNodeIdsRef.current.size === 0) {
        setIsNodeDragLocked(true)
      }
    },
    [isLevelComplete],
  )

  const handleRestart = useCallback(() => {
    loadLevel(level, playMode)
  }, [level, loadLevel, playMode])

  const handleNextFromComplete = useCallback(() => {
    if (playMode === "daily" || playMode === "weekly") {
      const nextIndex = sessionIndex + 1
      if (nextIndex >= sessionLevelIds.length) {
        setView("home")
        return
      }
      setSessionIndex(nextIndex)
      loadLevel(sessionLevelIds[nextIndex], playMode)
      return
    }

    startClassicLevel(level + 1)
  }, [
    level,
    loadLevel,
    playMode,
    sessionIndex,
    sessionLevelIds,
    startClassicLevel,
  ])

  const purchaseStoreItemByIdentifiers = useCallback(
    async (identifiers: string[]): Promise<boolean> => {
      if (Platform.OS !== "ios" && Platform.OS !== "android") {
        return false
      }

      try {
        const offerings = await Purchases.getOfferings()
        const matchingPackage = findRevenueCatPackageByIdentifiers(
          offerings,
          identifiers,
        )

        if (!matchingPackage) {
          return false
        }

        await Purchases.purchasePackage(matchingPackage)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const triggerPurchaseCelebration = useCallback(() => {
    setPurchaseCelebrationToken((previousToken) => previousToken + 1)
  }, [])

  const isCosmeticUnlocked = useCallback(
    (cosmeticId: string) => {
      const cosmeticItemKey = `cosmetic:${cosmeticId}`
      if (purchasedStoreItemIds.has(cosmeticItemKey)) {
        return true
      }

      return THEME_PACKS.some(
        (themePack) =>
          purchasedStoreItemIds.has(themePack.id) &&
          themePack.cosmeticIds.includes(cosmeticId),
      )
    },
    [purchasedStoreItemIds],
  )

  const handleBuyNoAds = useCallback(async () => {
    if (noAdsOwned) {
      return
    }

    const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
      NO_ADS_REVENUECAT_ID,
      NO_ADS_ITEM_ID,
    ])
    if (!purchaseSucceeded) {
      return
    }

    setNoAdsOwned(true)
    setPurchasedStoreItemIds((previousOwnedItems) => {
      const nextOwnedItems = new Set(previousOwnedItems)
      nextOwnedItems.add(NO_ADS_ITEM_ID)
      return nextOwnedItems
    })
    triggerPurchaseCelebration()
  }, [noAdsOwned, purchaseStoreItemByIdentifiers, triggerPurchaseCelebration])

  const handleBuyCosmetic = useCallback(
    async (cosmetic: Cosmetic) => {
      const cosmeticItemKey = `cosmetic:${cosmetic.id}`

      if (isCosmeticUnlocked(cosmetic.id)) {
        return
      }

      if (cosmetic.priceType === "real-money") {
        const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
          cosmetic.id,
        ])
        if (!purchaseSucceeded) {
          return
        }
      }

      setPurchasedStoreItemIds((previousOwnedItems) => {
        const nextOwnedItems = new Set(previousOwnedItems)
        nextOwnedItems.add(cosmeticItemKey)
        return nextOwnedItems
      })
      triggerPurchaseCelebration()

      if (cosmetic.category === "app-theme") {
        setEquippedThemeCosmeticId(cosmetic.id)
      }
    },
    [
      isCosmeticUnlocked,
      purchasedStoreItemIds,
      purchaseStoreItemByIdentifiers,
      triggerPurchaseCelebration,
    ],
  )

  const handleBuyLevelPack = useCallback(
    async (levelPack: LevelPack) => {
      const { storeItemId } = levelPack
      // const coinPrice = levelPack.price ?? 0;

      if (levelPack.defaultOwned || !storeItemId) {
        return
      }

      if (purchasedStoreItemIds.has(storeItemId)) {
        return
      }

      if (levelPack.priceType === "real-money") {
        const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
          levelPack.id,
          storeItemId,
        ])
        if (!purchaseSucceeded) {
          return
        }
        Alert.alert(
          "Purchase successful!",
          `You have unlocked ${levelPack.name}!`,
        )
      }

      setPurchasedStoreItemIds((previousOwnedItems) => {
        const nextOwnedItems = new Set(previousOwnedItems)
        nextOwnedItems.add(storeItemId)
        return nextOwnedItems
      })
      triggerPurchaseCelebration()
    },
    [
      purchasedStoreItemIds,
      purchaseStoreItemByIdentifiers,
      triggerPurchaseCelebration,
    ],
  )

  // Coin pack purchasing is temporarily disabled.
  // const handleBuyCoinPack = useCallback(
  //   async (coinPack: CoinPack) => {
  //     const { storeItemId } = coinPack;
  //     if (!storeItemId) {
  //       return;
  //     }

  //     const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
  //       coinPack.id,
  //       storeItemId,
  //     ]);
  //     if (!purchaseSucceeded) {
  //       return;
  //     }

  //     setCoins((previousCoins) => previousCoins + coinPack.coins);
  //     triggerPurchaseCelebration();
  //     Alert.alert(
  //       "Purchase successful!",
  //       `You have received ${coinPack.coins} coins!`,
  //     );
  //   },
  //   [purchaseStoreItemByIdentifiers, triggerPurchaseCelebration],
  // );

  const handleBuyThemePack = useCallback(
    async (themePack: ThemePack) => {
      if (purchasedStoreItemIds.has(themePack.id)) {
        return
      }

      const purchaseSucceeded = await purchaseStoreItemByIdentifiers([
        themePack.id,
      ])
      if (!purchaseSucceeded) {
        return
      }

      setPurchasedStoreItemIds((previousOwnedItems) => {
        const nextOwnedItems = new Set(previousOwnedItems)
        nextOwnedItems.add(themePack.id)
        return nextOwnedItems
      })
      triggerPurchaseCelebration()
      Alert.alert(
        "Purchase successful!",
        `You have unlocked ${themePack.name}!`,
      )
    },
    [
      purchasedStoreItemIds,
      purchaseStoreItemByIdentifiers,
      triggerPurchaseCelebration,
    ],
  )

  const handleApplyDefaultTheme = useCallback(() => {
    setEquippedThemeCosmeticId(null)
  }, [])

  const handleApplyCosmetic = useCallback(
    (cosmetic: Cosmetic) => {
      if (!isCosmeticUnlocked(cosmetic.id)) {
        return
      }

      if (cosmetic.category === "app-theme") {
        setEquippedThemeCosmeticId(cosmetic.id)
      }
    },
    [isCosmeticUnlocked],
  )

  const handleSelectLevelPack = useCallback((packId: string) => {
    setSelectedLevelPackId(packId)
    setView("levels")
  }, [])

  const navigateFromGameToLevelSelection = useCallback(() => {
    if (playMode === "daily" || playMode === "weekly") {
      setView("daily-weekly-levels")
      return
    }

    if (playMode === "time-trial") {
      setView("time-trial")
      return
    }

    setView("levels")
  }, [playMode])

  const renderView = (viewType: ViewType) => (
    <View style={styles.gameContainer}>
      <AppScreens
        viewType={viewType}
        theme={appTheme}
        level={level}
        completedClassicLevelIds={completedClassicLevelIds}
        completedDailyLevelIds={completedDailyLevelIds}
        completedWeeklyLevelIds={completedWeeklyLevelIds}
        selectedLevelPack={selectedLevelPack}
        levelPacksWithOwnership={levelPacksWithOwnership}
        noAdsOwned={noAdsOwned}
        noAdsPriceLabel={noAdsPriceLabel}
        purchasedStoreItemIds={purchasedStoreItemIds}
        equippedThemeCosmeticId={equippedThemeCosmeticId}
        levelPackPriceLabels={levelPackPriceLabels}
        themePackPriceLabels={themePackPriceLabels}
        purchaseCelebrationToken={purchaseCelebrationToken}
        nodes={nodes}
        links={links}
        intersectingLinks={intersectingLinks}
        isLevelComplete={isLevelComplete}
        isNodeDragLocked={isNodeDragLocked}
        timeTrialState={timeTrialState}
        playMode={playMode}
        reverseObjective={isReverseClassicPackActive}
        setView={setView}
        withMenuClickSound={withMenuClickSound}
        withThemeChangeSound={withThemeChangeSound}
        onRestoreAppInfo={handleRestoreAppInfo}
        onSelectLevelPack={handleSelectLevelPack}
        onStartClassicLevel={startClassicLevel}
        onStartDailyLevel={startDailyLevel}
        onStartWeeklyLevel={startWeeklyLevel}
        onStartTimeTrial={startTimeTrial}
        onBuyNoAds={handleBuyNoAds}
        onBuyCosmetic={handleBuyCosmetic}
        onBuyThemePack={handleBuyThemePack}
        onBuyLevelPack={handleBuyLevelPack}
        onApplyDefaultTheme={handleApplyDefaultTheme}
        onApplyCosmetic={handleApplyCosmetic}
        onOpenLevels={navigateFromGameToLevelSelection}
        onRestart={handleRestart}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragFinalize={handleNodeDragFinalize}
        onNextFromComplete={handleNextFromComplete}
      />
    </View>
  )

  const appTextureSource = appTheme.appTextureSource ?? null

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

      <NavigationContainer
        ref={navigationRef}
        onReady={handleNavStateChange}
        onStateChange={handleNavStateChange}
      >
        <Stack.Navigator
          initialRouteName="home"
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="home">{() => renderView("home")}</Stack.Screen>
          <Stack.Screen name="admin">{() => renderView("admin")}</Stack.Screen>
          <Stack.Screen name="level-packs">
            {() => renderView("level-packs")}
          </Stack.Screen>
          <Stack.Screen name="levels">
            {() => renderView("levels")}
          </Stack.Screen>
          <Stack.Screen name="daily-weekly-levels">
            {() => renderView("daily-weekly-levels")}
          </Stack.Screen>
          <Stack.Screen name="time-trial">
            {() => renderView("time-trial")}
          </Stack.Screen>
          <Stack.Screen name="store">{() => renderView("store")}</Stack.Screen>
          <Stack.Screen name="game">{() => renderView("game")}</Stack.Screen>
          <Stack.Screen name="complete">
            {() => renderView("complete")}
          </Stack.Screen>
          <Stack.Screen name="time-trial-result">
            {() => renderView("time-trial-result")}
          </Stack.Screen>
          <Stack.Screen name="settings">
            {() => renderView("settings")}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>

      {shouldEnableAds && !noAdsOwned && <BannerAdSlot />}

      {__DEV__ && (
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
      )}

      {/* </SafeAreaView> */}
    </GestureHandlerRootView>
  )
}
