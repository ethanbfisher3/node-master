import React, { useCallback, useEffect, useRef } from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { ArrowLeft, BadgeCheck, ShoppingBag } from "lucide-react-native"
import { Audio } from "expo-av"

import {
  AppThemePalette,
  CosmeticCategory,
  DEFAULT_APP_THEME,
  DEFAULT_NODE_LINE_STYLE,
} from "../data/cosmetics"
import { styles } from "../styles"
import { Cosmetic } from "../data/cosmetics"
import { LevelPack } from "../data/levelPacks"
import coinPacks from "../data/coinPacks"

type SelectableLevelPack = LevelPack & {
  owned: boolean
}

type StoreScreenProps = {
  coins: number
  noAdsOwned: boolean
  noAdsPrice: number
  cosmetics: Cosmetic[]
  levelPacks: SelectableLevelPack[]
  purchasedStoreItemIds: Set<string>
  equippedThemeCosmeticId: string | null
  equippedBoardCosmeticId: string | null
  onBack: () => void
  onBuyNoAds: () => void
  onBuyCosmetic: (cosmetic: Cosmetic) => void
  onBuyLevelPack: (levelPack: SelectableLevelPack) => void
  onBuyCoinPack: (coinPack: (typeof coinPacks)[number]) => void
  onApplyDefaultTheme: () => void
  onApplyCosmetic: (cosmetic: Cosmetic) => void
  theme?: AppThemePalette
}

function isCategory(cosmetic: Cosmetic, category: CosmeticCategory): boolean {
  return cosmetic.category === category
}

export function StoreScreen({
  coins,
  noAdsOwned,
  noAdsPrice,
  cosmetics,
  levelPacks,
  purchasedStoreItemIds,
  equippedThemeCosmeticId,
  equippedBoardCosmeticId,
  onBack,
  onBuyNoAds,
  onBuyCosmetic,
  onBuyLevelPack,
  onBuyCoinPack,
  onApplyDefaultTheme,
  onApplyCosmetic,
  theme,
}: StoreScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME
  const themeChangeSoundRef = useRef<Audio.Sound | null>(null)
  const isThemeChangeSoundLoadingRef = useRef(false)
  const previousEquippedThemeIdRef = useRef<string | null | undefined>(
    undefined,
  )
  const stopThemeChangeSoundTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const cosmeticItems = Array.isArray(cosmetics) ? cosmetics : []
  const levelPackItems = Array.isArray(levelPacks) ? levelPacks : []
  const themeCosmetics = cosmeticItems.filter((cosmetic) =>
    isCategory(cosmetic, "app-theme"),
  )
  const nodeLineStyleCosmetics = cosmeticItems.filter((cosmetic) =>
    isCategory(cosmetic, "node-line-style"),
  )

  const clearThemeChangeSoundStopTimeout = useCallback(() => {
    if (!stopThemeChangeSoundTimeoutRef.current) {
      return
    }

    clearTimeout(stopThemeChangeSoundTimeoutRef.current)
    stopThemeChangeSoundTimeoutRef.current = null
  }, [])

  const playThemeChangeSnippet = useCallback(async () => {
    try {
      if (!themeChangeSoundRef.current) {
        if (isThemeChangeSoundLoadingRef.current) {
          return
        }

        isThemeChangeSoundLoadingRef.current = true
        const { sound } = await Audio.Sound.createAsync(
          require("../sounds/theme_change.mp3"),
          {
            shouldPlay: false,
            volume: 0.3,
          },
        )
        themeChangeSoundRef.current = sound
      }

      clearThemeChangeSoundStopTimeout()

      await themeChangeSoundRef.current.setPositionAsync(0)
      await themeChangeSoundRef.current.playAsync()

      stopThemeChangeSoundTimeoutRef.current = setTimeout(() => {
        const activeSound = themeChangeSoundRef.current
        if (!activeSound) {
          return
        }

        void activeSound.pauseAsync()
        void activeSound.setPositionAsync(0)
      }, 500)
    } catch {
      // Ignore playback errors so theme application remains responsive.
    } finally {
      isThemeChangeSoundLoadingRef.current = false
    }
  }, [clearThemeChangeSoundStopTimeout])

  useEffect(() => {
    const previousThemeId = previousEquippedThemeIdRef.current
    if (previousThemeId === undefined) {
      previousEquippedThemeIdRef.current = equippedThemeCosmeticId
      return
    }

    if (previousThemeId === equippedThemeCosmeticId) {
      return
    }

    previousEquippedThemeIdRef.current = equippedThemeCosmeticId
    void playThemeChangeSnippet()
  }, [equippedThemeCosmeticId, playThemeChangeSnippet])

  useEffect(() => {
    return () => {
      clearThemeChangeSoundStopTimeout()
      void themeChangeSoundRef.current?.unloadAsync()
      themeChangeSoundRef.current = null
    }
  }, [clearThemeChangeSoundStopTimeout])

  return (
    <View
      style={[
        styles.levelsContainer,
        { backgroundColor: activeTheme.background },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={[
            styles.backButton,
            { backgroundColor: activeTheme.surfaceAlt },
          ]}
        >
          <ArrowLeft size={24} color={activeTheme.mutedText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: activeTheme.text }]}>
          STORE
        </Text>
      </View>

      <ScrollView
        style={styles.levelsScroll}
        contentContainerStyle={styles.storeScrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View
          style={[
            styles.modeCard,
            {
              backgroundColor: activeTheme.surfaceAlt,
              borderColor: activeTheme.surfaceAlt,
            },
          ]}
        >
          <View style={styles.modeCardHeader}>
            <ShoppingBag size={20} color={activeTheme.text} />
            <Text
              style={[styles.modeCardTitle, { color: activeTheme.cardText }]}
            >
              NO ADS
            </Text>
          </View>
          <Text
            style={[styles.modeCardBody, { color: activeTheme.cardMutedText }]}
          >
            Permanently disable ads for this profile.
          </Text>

          <TouchableOpacity
            style={[
              styles.modeCardButton,
              (noAdsOwned || coins < noAdsPrice) &&
                styles.modeCardButtonDisabled,
              { backgroundColor: activeTheme.primary },
            ]}
            onPress={onBuyNoAds}
            disabled={noAdsOwned || coins < noAdsPrice}
          >
            {noAdsOwned ? (
              <BadgeCheck size={18} color="white" />
            ) : (
              <ShoppingBag size={18} color="white" />
            )}
            <Text style={styles.modeCardButtonText}>
              {noAdsOwned ? "PURCHASED" : `$${noAdsPrice.toFixed(2)}`}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
          Cosmetics
        </Text>
        <Text style={[styles.modeCardBody, { color: activeTheme.mutedText }]}>
          Themes
        </Text>
        <View
          style={[
            styles.modeCard,
            {
              backgroundColor: DEFAULT_APP_THEME.surfaceAlt,
              borderColor: DEFAULT_APP_THEME.surfaceAlt,
            },
          ]}
        >
          <View style={styles.modeCardHeader}>
            <ShoppingBag size={20} color={DEFAULT_APP_THEME.primary} />
            <Text
              style={[
                styles.modeCardTitle,
                { color: DEFAULT_APP_THEME.cardText },
              ]}
            >
              Default Theme
            </Text>
          </View>
          {/* <Text
            style={[
              styles.modeCardBody,
              { color: DEFAULT_APP_THEME.cardMutedText },
            ]}
          >
            The original app colors. Always owned.
          </Text> */}

          <TouchableOpacity
            style={[
              styles.modeCardButton,
              equippedThemeCosmeticId === null && styles.modeCardButtonDisabled,
              {
                backgroundColor: DEFAULT_APP_THEME.primary,
              },
            ]}
            onPress={onApplyDefaultTheme}
            disabled={equippedThemeCosmeticId === null}
          >
            <Text style={styles.modeCardButtonText}>
              {equippedThemeCosmeticId === null ? "EQUIPPED" : "APPLY"}
            </Text>
          </TouchableOpacity>
        </View>
        {themeCosmetics.map((cosmetic) => {
          const cosmeticItemKey = `cosmetic:${cosmetic.id}`
          const isOwned = purchasedStoreItemIds.has(cosmeticItemKey)
          const isEquipped = isOwned && equippedThemeCosmeticId === cosmetic.id
          const cannotAffordCoins =
            cosmetic.priceType === "coins" && coins < cosmetic.price
          const previewTheme = { ...DEFAULT_APP_THEME, ...cosmetic.theme }

          return (
            <View
              style={[
                styles.modeCard,
                {
                  backgroundColor: previewTheme.surfaceAlt,
                  borderColor: previewTheme.surfaceAlt,
                },
              ]}
              key={cosmetic.id}
            >
              <View style={styles.modeCardHeader}>
                <ShoppingBag size={20} color={previewTheme.primary} />
                <Text
                  style={[
                    styles.modeCardTitle,
                    { color: previewTheme.cardText },
                  ]}
                >
                  {cosmetic.name}
                </Text>
              </View>
              {/* <Text
                style={[
                  styles.modeCardBody,
                  { color: previewTheme.cardMutedText },
                ]}
              >
                {cosmetic.description}
              </Text> */}

              <TouchableOpacity
                style={[
                  styles.modeCardButton,
                  ((isOwned && isEquipped) ||
                    (!isOwned && cannotAffordCoins)) &&
                    styles.modeCardButtonDisabled,
                  {
                    backgroundColor: previewTheme.primary,
                    opacity: coins >= cosmetic.price ? 1 : 0.8,
                  },
                ]}
                onPress={() =>
                  isOwned ? onApplyCosmetic(cosmetic) : onBuyCosmetic(cosmetic)
                }
                disabled={
                  (isOwned && isEquipped) || (!isOwned && cannotAffordCoins)
                }
              >
                <Text style={[styles.modeCardButtonText, { color: "white" }]}>
                  {isOwned
                    ? isEquipped
                      ? "EQUIPPED"
                      : "USE"
                    : cosmetic.priceType === "coins"
                      ? `${cosmetic.price} coins`
                      : `$${cosmetic.price.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}

        <Text style={[styles.modeCardBody, { color: activeTheme.mutedText }]}>
          Node &amp; Line Styles
        </Text>
        {nodeLineStyleCosmetics.map((cosmetic) => {
          const cosmeticItemKey = `cosmetic:${cosmetic.id}`
          const isOwned = purchasedStoreItemIds.has(cosmeticItemKey)
          const isApplied = isOwned && equippedBoardCosmeticId === cosmetic.id
          const cannotAffordCoins =
            cosmetic.priceType === "coins" && coins < cosmetic.price
          const previewStyle = {
            ...DEFAULT_NODE_LINE_STYLE,
            ...(cosmetic.nodeLineStyle ?? {}),
          }

          return (
            <View
              style={[
                styles.modeCard,
                {
                  backgroundColor: activeTheme.surfaceAlt,
                  borderColor: activeTheme.surfaceAlt,
                },
              ]}
              key={cosmetic.id}
            >
              <View style={styles.modeCardHeader}>
                <ShoppingBag size={20} color={previewStyle.line} />
                <Text
                  style={[
                    styles.modeCardTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  {cosmetic.name}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modeCardButton,
                  ((isOwned && isApplied) || (!isOwned && cannotAffordCoins)) &&
                    styles.modeCardButtonDisabled,
                  {
                    backgroundColor: previewStyle.nodeBorder,
                    opacity: coins >= cosmetic.price ? 1 : 0.8,
                  },
                ]}
                onPress={() =>
                  isOwned ? onApplyCosmetic(cosmetic) : onBuyCosmetic(cosmetic)
                }
                disabled={
                  (isOwned && isApplied) || (!isOwned && cannotAffordCoins)
                }
              >
                <Text style={[styles.modeCardButtonText, { color: "white" }]}>
                  {isOwned
                    ? isApplied
                      ? "APPLIED"
                      : "APPLY"
                    : cosmetic.priceType === "coins"
                      ? `${cosmetic.price} coins`
                      : `$${cosmetic.price.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}

        <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
          Packs
        </Text>
        {levelPackItems.map((levelPack) => {
          if (levelPack.defaultOwned) return null

          const isOwned =
            levelPack.owned ||
            levelPack.defaultOwned ||
            (levelPack.storeItemId
              ? purchasedStoreItemIds.has(levelPack.storeItemId)
              : false)
          const cannotAffordCoins =
            !isOwned &&
            levelPack.priceType === "coins" &&
            coins < levelPack.price

          return (
            <View
              style={[
                styles.modeCard,
                {
                  backgroundColor: activeTheme.surfaceAlt,
                  borderColor: activeTheme.surfaceAlt,
                },
              ]}
              key={levelPack.id}
            >
              <View style={styles.modeCardHeader}>
                <ShoppingBag size={20} color={activeTheme.text} />
                <Text
                  style={[
                    styles.modeCardTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  {levelPack.name}
                </Text>
              </View>
              {/* <Text
                style={[
                  styles.modeCardBody,
                  { color: activeTheme.cardMutedText },
                ]}
              >
                {levelPack.description}
              </Text> */}

              <TouchableOpacity
                style={[
                  styles.modeCardButton,
                  (isOwned || (!isOwned && cannotAffordCoins)) &&
                    styles.modeCardButtonDisabled,
                  {
                    backgroundColor: activeTheme.primary,
                    opacity: coins < levelPack.price || isOwned ? 0.8 : 1,
                  },
                ]}
                onPress={() => onBuyLevelPack(levelPack)}
                disabled={isOwned || (!isOwned && cannotAffordCoins)}
              >
                <Text style={[styles.modeCardButtonText, { color: "white" }]}>
                  {isOwned
                    ? "OWNED"
                    : levelPack.priceType === "coins"
                      ? `${levelPack.price} coins`
                      : `$${levelPack.price.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}

        <View
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
            Coins ({coins})
          </Text>
          {/* <Text
            style={[styles.modeCardBody, { color: activeTheme.cardMutedText }]}
          >
            You have {coins}
          </Text> */}
        </View>
        {coinPacks.map((coinPack) => {
          return (
            <View
              style={[
                styles.modeCard,
                {
                  backgroundColor: activeTheme.surfaceAlt,
                  borderColor: activeTheme.surfaceAlt,
                },
              ]}
              key={coinPack.id}
            >
              <View style={styles.modeCardHeader}>
                <ShoppingBag size={20} color={activeTheme.text} />
                <Text
                  style={[
                    styles.modeCardTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  {coinPack.name} - {coinPack.coins} coins
                </Text>
              </View>
              {/* <Text
                style={[
                  styles.modeCardBody,
                  { color: activeTheme.cardMutedText },
                ]}
              >
                {coinPack.description}
              </Text> */}

              <TouchableOpacity
                style={[
                  styles.modeCardButton,
                  {
                    backgroundColor: activeTheme.primary,
                  },
                ]}
                onPress={() => onBuyCoinPack(coinPack)}
              >
                <Text style={[styles.modeCardButtonText, { color: "white" }]}>
                  ${coinPack.priceDollars.toFixed(2)}
                </Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
