import React from "react"
import { AdminScreen } from "../screens/AdminScreen"
import { CompleteScreen } from "../screens/CompleteScreen"
import { GameScreen } from "../screens/GameScreen"
import { HomeScreen } from "../screens/HomeScreen"
import { LevelPackScreen } from "../screens/LevelPackScreen"
import { LevelsScreen } from "../screens/LevelsScreen"
import { SettingsScreen } from "../screens/SettingsScreen"
import { StoreScreen } from "../screens/StoreScreen"
import { TimeTrialResultScreen } from "../screens/TimeTrialResultScreen"
import { TimeTrialScreen } from "../screens/TimeTrialScreen"
import cosmetics, {
  AppThemePalette,
  Cosmetic,
  ThemePack,
} from "../data/cosmetics"
import { LevelPack } from "../data/levelPacks"
import type { Link, Node } from "../utils/gameLogic"
import {
  COMPLETED_LEVELS_STORAGE_KEY,
  DAILY_LEVEL_IDS,
  NO_ADS_PRICE,
  PLAYER_PROGRESS_STORAGE_KEY,
  WEEKLY_LEVEL_IDS,
} from "./constants"
import type { PlayMode, TimeTrialState, TrialDuration, ViewType } from "./types"
import type { ViewStackMode } from "./useViewStack"

type LevelPackWithOwnership = LevelPack & { owned: boolean }

type CallbackWrapper = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
) => (...args: TArgs) => void

type AppScreensProps = {
  viewType: ViewType
  theme: AppThemePalette
  level: number
  completedClassicLevelIds: Set<number>
  completedDailyLevelIds: Set<number>
  completedWeeklyLevelIds: Set<number>
  selectedLevelPack: LevelPack | null
  levelPacksWithOwnership: LevelPackWithOwnership[]
  noAdsOwned: boolean
  noAdsPriceLabel: string | null
  purchasedStoreItemIds: Set<string>
  equippedThemeCosmeticId: string | null
  levelPackPriceLabels: Record<string, string>
  themePackPriceLabels: Record<string, string>
  purchaseCelebrationToken: number
  nodes: Node[]
  links: Link[]
  intersectingLinks: Set<string>
  isLevelComplete: boolean
  isNodeDragLocked: boolean
  timeTrialState: TimeTrialState
  playMode: PlayMode
  reverseObjective: boolean
  setView: (nextView: ViewType, mode?: ViewStackMode) => void
  withMenuClickSound: CallbackWrapper
  withThemeChangeSound: CallbackWrapper
  onRestoreAppInfo: () => void
  onSelectLevelPack: (packId: string) => void
  onStartClassicLevel: (levelId: number) => void
  onStartDailyLevel: (levelId: number) => void
  onStartWeeklyLevel: (levelId: number) => void
  onStartTimeTrial: (nodeCount: number, duration: TrialDuration) => void
  onBuyNoAds: () => void
  onBuyCosmetic: (cosmetic: Cosmetic) => void
  onBuyThemePack: (themePack: ThemePack) => void
  onBuyLevelPack: (levelPack: LevelPack) => void
  onApplyDefaultTheme: () => void
  onApplyCosmetic: (cosmetic: Cosmetic) => void
  onOpenLevels: () => void
  onRestart: () => void
  onNodeDrag: (id: string, x: number, y: number) => void
  onNodeDragEnd: (id: string, x: number, y: number) => void
  onNodeDragStart: (id: string) => void
  onNodeDragFinalize: (id: string) => void
  onNextFromComplete: () => void
}

export function AppScreens({
  viewType,
  theme,
  level,
  completedClassicLevelIds,
  completedDailyLevelIds,
  completedWeeklyLevelIds,
  selectedLevelPack,
  levelPacksWithOwnership,
  noAdsOwned,
  noAdsPriceLabel,
  purchasedStoreItemIds,
  equippedThemeCosmeticId,
  levelPackPriceLabels,
  themePackPriceLabels,
  purchaseCelebrationToken,
  nodes,
  links,
  intersectingLinks,
  isLevelComplete,
  isNodeDragLocked,
  timeTrialState,
  playMode,
  reverseObjective,
  setView,
  withMenuClickSound,
  withThemeChangeSound,
  onRestoreAppInfo,
  onSelectLevelPack,
  onStartClassicLevel,
  onStartDailyLevel,
  onStartWeeklyLevel,
  onStartTimeTrial,
  onBuyNoAds,
  onBuyCosmetic,
  onBuyThemePack,
  onBuyLevelPack,
  onApplyDefaultTheme,
  onApplyCosmetic,
  onOpenLevels,
  onRestart,
  onNodeDrag,
  onNodeDragEnd,
  onNodeDragStart,
  onNodeDragFinalize,
  onNextFromComplete,
}: AppScreensProps) {
  switch (viewType) {
    case "home":
      return (
        <HomeScreen
          theme={theme}
          // coins={coins}
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
            __DEV__ ? withMenuClickSound(onRestoreAppInfo) : undefined
          }
          onSettings={withMenuClickSound(() => setView("settings"))}
        />
      )
    case "level-packs":
      return (
        <LevelPackScreen
          theme={theme}
          packs={levelPacksWithOwnership}
          onBack={withMenuClickSound(() => setView("home"))}
          goToStore={withMenuClickSound(() => setView("store"))}
          onSelectPack={withMenuClickSound(onSelectLevelPack)}
        />
      )
    case "admin":
      if (!__DEV__) {
        return null
      }
      return (
        <AdminScreen
          onBack={withMenuClickSound(() => setView("home"))}
          knownKeys={[
            PLAYER_PROGRESS_STORAGE_KEY,
            COMPLETED_LEVELS_STORAGE_KEY,
          ]}
        />
      )
    case "levels":
      return (
        <LevelsScreen
          theme={theme}
          currentLevel={level}
          completedLevelIds={completedClassicLevelIds}
          title={selectedLevelPack?.name ?? "LEVELS"}
          levelIds={selectedLevelPack?.levelIds}
          onBack={withMenuClickSound(() => setView("level-packs"))}
          onStartLevel={withMenuClickSound(onStartClassicLevel)}
        />
      )
    case "daily-weekly-levels":
      return (
        <LevelsScreen
          theme={theme}
          currentLevel={level}
          completedLevelIds={completedDailyLevelIds}
          title="DAILY / WEEKLY"
          sections={[
            {
              title: "DAILY",
              levelIds: DAILY_LEVEL_IDS,
              onStartLevel: withMenuClickSound(onStartDailyLevel),
              completedLevelIds: completedDailyLevelIds,
            },
            {
              title: "WEEKLY",
              levelIds: WEEKLY_LEVEL_IDS,
              onStartLevel: withMenuClickSound(onStartWeeklyLevel),
              completedLevelIds: completedWeeklyLevelIds,
            },
          ]}
          showNodeHeaders={false}
          onBack={withMenuClickSound(() => setView("home"))}
          onStartLevel={withMenuClickSound(onStartDailyLevel)}
        />
      )
    case "time-trial":
      return (
        <TimeTrialScreen
          theme={theme}
          onBack={withMenuClickSound(() => setView("home"))}
          onStartTrial={withMenuClickSound(onStartTimeTrial)}
        />
      )
    case "store":
      return (
        <StoreScreen
          theme={theme}
          // coins={coins}
          noAdsOwned={noAdsOwned}
          noAdsPrice={NO_ADS_PRICE}
          noAdsPriceLabel={noAdsPriceLabel}
          cosmetics={cosmetics}
          levelPacks={levelPacksWithOwnership}
          purchasedStoreItemIds={purchasedStoreItemIds}
          equippedThemeCosmeticId={equippedThemeCosmeticId}
          onBack={withMenuClickSound(() => setView("home"))}
          onBuyNoAds={withMenuClickSound(onBuyNoAds)}
          onBuyCosmetic={withMenuClickSound(onBuyCosmetic)}
          onBuyThemePack={withMenuClickSound(onBuyThemePack)}
          onBuyLevelPack={withMenuClickSound(onBuyLevelPack)}
          // onBuyCoinPack={withMenuClickSound(onBuyCoinPack)}
          // coinPackPriceLabels={coinPackPriceLabels}
          levelPackPriceLabels={levelPackPriceLabels}
          themePackPriceLabels={themePackPriceLabels}
          onApplyDefaultTheme={withThemeChangeSound(onApplyDefaultTheme)}
          onApplyCosmetic={withThemeChangeSound(onApplyCosmetic)}
          purchaseCelebrationToken={purchaseCelebrationToken}
        />
      )
    case "game":
      return (
        <GameScreen
          theme={theme}
          level={level}
          // coins={coins}
          nodes={nodes}
          links={links}
          intersectingLinks={intersectingLinks}
          isLevelComplete={isLevelComplete}
          isNodeDragLocked={isNodeDragLocked}
          trialTimeLeftSeconds={
            playMode === "time-trial"
              ? timeTrialState.timeLeftSeconds
              : undefined
          }
          reverseObjective={reverseObjective}
          noAdsOwned={noAdsOwned}
          onBackHome={withMenuClickSound(() => setView("home"))}
          onOpenLevels={withMenuClickSound(onOpenLevels)}
          onRestart={withMenuClickSound(onRestart)}
          onNodeDrag={onNodeDrag}
          onNodeDragEnd={onNodeDragEnd}
          onNodeDragStart={onNodeDragStart}
          onNodeDragFinalize={onNodeDragFinalize}
        />
      )
    case "complete":
      return (
        <CompleteScreen
          theme={theme}
          level={level}
          nodeCount={nodes.length}
          onHome={withMenuClickSound(() => setView("home"))}
          onNextLevel={withMenuClickSound(onNextFromComplete)}
        />
      )
    case "time-trial-result":
      return (
        <TimeTrialResultScreen
          solvedCount={timeTrialState.solvedCount}
          // earnedCoins={timeTrialState.earnedCoins}
          nodeCount={timeTrialState.nodeCount}
          durationSeconds={timeTrialState.durationSeconds}
          onHome={withMenuClickSound(() => setView("home"))}
          onPlayAgain={withMenuClickSound(() => setView("time-trial", "popTo"))}
        />
      )
    case "settings":
      return (
        <SettingsScreen
          onBack={withMenuClickSound(() => setView("home"))}
          theme={theme}
        />
      )
    default:
      return null
  }
}
