import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, BadgeCheck, ShoppingBag } from "lucide-react-native";
import { Audio } from "expo-av";

import {
  AppThemePalette,
  DEFAULT_APP_THEME,
  ThemePack,
  THEME_PACKS,
} from "../data/cosmetics";
import { styles } from "../styles";
import { Cosmetic } from "../data/cosmetics";
import { LevelPack } from "../data/levelPacks";
import coinPacks from "../data/coinPacks";

type SelectableLevelPack = LevelPack & {
  owned: boolean;
};

type StoreScreenProps = {
  coins: number;
  noAdsOwned: boolean;
  noAdsPrice: number;
  noAdsPriceLabel: string | null;
  cosmetics: Cosmetic[];
  levelPacks: SelectableLevelPack[];
  purchasedStoreItemIds: Set<string>;
  equippedThemeCosmeticId: string | null;
  onBack: () => void;
  onBuyNoAds: () => void;
  onBuyCosmetic: (cosmetic: Cosmetic) => void;
  onBuyThemePack: (themePack: ThemePack) => void;
  onBuyLevelPack: (levelPack: SelectableLevelPack) => void;
  onBuyCoinPack: (coinPack: (typeof coinPacks)[number]) => void;
  coinPackPriceLabels: Record<string, string>;
  levelPackPriceLabels: Record<string, string>;
  themePackPriceLabels: Record<string, string>;
  onApplyDefaultTheme: () => void;
  onApplyCosmetic: (cosmetic: Cosmetic) => void;
  purchaseCelebrationToken: number;
  theme?: AppThemePalette;
};

type ConfettiPiece = {
  id: string;
  left: number;
  top: number;
  size: number;
  drift: number;
  rise: number;
  rotation: number;
  delay: number;
  color: string;
  value: Animated.Value;
};

function PurchaseCelebrationBurst({ triggerToken }: { triggerToken: number }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const previousTriggerTokenRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimeout = useCallback(() => {
    if (!hideTimeoutRef.current) {
      return;
    }

    clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout]);

  useEffect(() => {
    if (previousTriggerTokenRef.current === null) {
      previousTriggerTokenRef.current = triggerToken;
      return;
    }

    if (previousTriggerTokenRef.current === triggerToken) {
      return;
    }

    previousTriggerTokenRef.current = triggerToken;
    clearHideTimeout();

    const screenWidth = Dimensions.get("window").width;
    const palette = [
      "#f97316",
      "#facc15",
      "#22c55e",
      "#38bdf8",
      "#fb7185",
      "#a78bfa",
    ];

    const nextPieces = Array.from({ length: 14 }, (_, index) => {
      const value = new Animated.Value(0);
      const horizontalStart = screenWidth * (0.32 + Math.random() * 0.36);

      return {
        id: `${triggerToken}-${index}`,
        left: horizontalStart,
        top: 72 + Math.random() * 20,
        size: 6 + Math.random() * 5,
        drift: (Math.random() - 0.5) * 180,
        rise: 120 + Math.random() * 90,
        rotation: (Math.random() - 0.5) * 260,
        delay: index * 28,
        color: palette[index % palette.length],
        value,
      };
    });

    setPieces(nextPieces);
    setIsVisible(true);

    Animated.parallel(
      nextPieces.map((piece) =>
        Animated.timing(piece.value, {
          toValue: 1,
          duration: 920,
          delay: piece.delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ),
    ).start();

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 1300);
  }, [clearHideTimeout, triggerToken]);

  if (!isVisible) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        elevation: 999,
        overflow: "hidden",
      }}
    >
      {pieces.map((piece) => {
        const translateX = piece.value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, piece.drift],
        });
        const translateY = piece.value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -piece.rise],
        });
        const rotate = piece.value.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${piece.rotation}deg`],
        });
        const opacity = piece.value.interpolate({
          inputRange: [0, 0.15, 0.75, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = piece.value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.65, 1],
        });

        return (
          <Animated.View
            key={piece.id}
            style={{
              position: "absolute",
              left: piece.left,
              top: piece.top,
              width: piece.size,
              height: piece.size * 1.4,
              borderRadius: piece.size / 2,
              backgroundColor: piece.color,
              opacity,
              transform: [
                { translateX },
                { translateY },
                { rotate },
                { scale },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

export function StoreScreen({
  coins,
  noAdsOwned,
  noAdsPrice,
  noAdsPriceLabel,
  cosmetics,
  levelPacks,
  purchasedStoreItemIds,
  equippedThemeCosmeticId,
  onBack,
  onBuyNoAds,
  onBuyThemePack,
  onBuyCosmetic,
  onBuyLevelPack,
  onBuyCoinPack,
  coinPackPriceLabels,
  levelPackPriceLabels,
  themePackPriceLabels,
  onApplyDefaultTheme,
  onApplyCosmetic,
  purchaseCelebrationToken,
  theme,
}: StoreScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME;
  const [expandedThemePackId, setExpandedThemePackId] = useState<
    ThemePack["id"] | null
  >(null);
  const themeChangeSoundRef = useRef<Audio.Sound | null>(null);
  const isThemeChangeSoundLoadingRef = useRef(false);
  const previousEquippedThemeIdRef = useRef<string | null | undefined>(
    undefined,
  );
  const stopThemeChangeSoundTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const cosmeticItems = Array.isArray(cosmetics) ? cosmetics : [];
  const levelPackItems = Array.isArray(levelPacks) ? levelPacks : [];
  const cosmeticsById = useMemo(
    () => new Map(cosmeticItems.map((cosmetic) => [cosmetic.id, cosmetic])),
    [cosmeticItems],
  );
  const themePacksWithCosmetics = useMemo(
    () =>
      THEME_PACKS.map((themePack) => ({
        ...themePack,
        cosmetics: themePack.cosmeticIds
          .map((cosmeticId) => cosmeticsById.get(cosmeticId))
          .filter((entry): entry is Cosmetic => Boolean(entry)),
      })),
    [cosmeticsById],
  );
  const isCosmeticOwned = useCallback(
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

  const clearThemeChangeSoundStopTimeout = useCallback(() => {
    if (!stopThemeChangeSoundTimeoutRef.current) {
      return;
    }

    clearTimeout(stopThemeChangeSoundTimeoutRef.current);
    stopThemeChangeSoundTimeoutRef.current = null;
  }, []);

  const playThemeChangeSnippet = useCallback(async () => {
    try {
      if (!themeChangeSoundRef.current) {
        if (isThemeChangeSoundLoadingRef.current) {
          return;
        }

        isThemeChangeSoundLoadingRef.current = true;
        const { sound } = await Audio.Sound.createAsync(
          require("../sounds/theme_change.mp3"),
          {
            shouldPlay: false,
            volume: 0.3,
          },
        );
        themeChangeSoundRef.current = sound;
      }

      clearThemeChangeSoundStopTimeout();

      await themeChangeSoundRef.current.setPositionAsync(0);
      await themeChangeSoundRef.current.playAsync();

      stopThemeChangeSoundTimeoutRef.current = setTimeout(() => {
        const activeSound = themeChangeSoundRef.current;
        if (!activeSound) {
          return;
        }

        void activeSound.pauseAsync();
        void activeSound.setPositionAsync(0);
      }, 500);
    } catch {
      // Ignore playback errors so theme application remains responsive.
    } finally {
      isThemeChangeSoundLoadingRef.current = false;
    }
  }, [clearThemeChangeSoundStopTimeout]);

  useEffect(() => {
    const previousThemeId = previousEquippedThemeIdRef.current;
    if (previousThemeId === undefined) {
      previousEquippedThemeIdRef.current = equippedThemeCosmeticId;
      return;
    }

    if (previousThemeId === equippedThemeCosmeticId) {
      return;
    }

    previousEquippedThemeIdRef.current = equippedThemeCosmeticId;
    void playThemeChangeSnippet();
  }, [equippedThemeCosmeticId, playThemeChangeSnippet]);

  useEffect(() => {
    return () => {
      clearThemeChangeSoundStopTimeout();
      void themeChangeSoundRef.current?.unloadAsync();
      themeChangeSoundRef.current = null;
    };
  }, [clearThemeChangeSoundStopTimeout]);

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
              noAdsOwned && styles.modeCardButtonDisabled,
              { backgroundColor: activeTheme.primary },
            ]}
            onPress={onBuyNoAds}
            disabled={noAdsOwned}
          >
            {noAdsOwned ? (
              <BadgeCheck size={18} color="white" />
            ) : (
              <ShoppingBag size={18} color="white" />
            )}
            <Text style={styles.modeCardButtonText}>
              {noAdsOwned
                ? "PURCHASED"
                : (noAdsPriceLabel ?? `$${noAdsPrice.toFixed(2)}`)}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
          Theme Packs
        </Text>
        <Text style={[styles.modeCardBody, { color: activeTheme.mutedText }]}>
          Choose a pack to unlock and browse included themes.
        </Text>
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
            <ShoppingBag size={20} color={activeTheme.primary} />
            <Text
              style={[styles.modeCardTitle, { color: activeTheme.cardText }]}
            >
              Default Theme
            </Text>
          </View>
          <View
            style={{
              marginTop: 6,
              padding: 8,
              borderRadius: 8,
              backgroundColor: DEFAULT_APP_THEME.background,
              borderWidth: 1,
              borderColor: DEFAULT_APP_THEME.surfaceAlt,
              gap: 6,
            }}
          >
            <View
              style={{
                height: 16,
                borderRadius: 6,
                backgroundColor: DEFAULT_APP_THEME.surfaceAlt,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: DEFAULT_APP_THEME.primary,
                }}
              />
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: DEFAULT_APP_THEME.text,
                }}
              />
            </View>
          </View>

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
        {themePacksWithCosmetics.map((themePack) => {
          const isPackOwned = purchasedStoreItemIds.has(themePack.id);
          const isExpanded = expandedThemePackId === themePack.id;
          const packPriceLabel =
            themePackPriceLabels[themePack.id] ?? "Loading...";

          return (
            <View
              style={[
                styles.modeCard,
                {
                  backgroundColor: activeTheme.surfaceAlt,
                  borderColor: activeTheme.surfaceAlt,
                },
              ]}
              key={themePack.id}
            >
              <View style={styles.modeCardHeader}>
                <ShoppingBag size={20} color={activeTheme.text} />
                <Text
                  style={[
                    styles.modeCardTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  {themePack.name}
                </Text>
              </View>

              <Text
                style={[
                  styles.modeCardBody,
                  { color: activeTheme.cardMutedText },
                ]}
              >
                {themePack.description}
              </Text>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.modeCardButton,
                    isPackOwned && styles.modeCardButtonDisabled,
                    { backgroundColor: activeTheme.primary },
                  ]}
                  onPress={() => onBuyThemePack(themePack)}
                  disabled={isPackOwned}
                >
                  <Text style={[styles.modeCardButtonText, { color: "white" }]}>
                    {isPackOwned ? "OWNED" : packPriceLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeCardButton,
                    {
                      backgroundColor: activeTheme.surface,
                      borderWidth: 1,
                      borderColor: activeTheme.primary,
                    },
                  ]}
                  onPress={() =>
                    setExpandedThemePackId((previousPackId) =>
                      previousPackId === themePack.id ? null : themePack.id,
                    )
                  }
                >
                  <Text
                    style={[
                      styles.modeCardButtonText,
                      { color: activeTheme.primary },
                    ]}
                  >
                    {isExpanded ? "HIDE CONTENTS" : "VIEW CONTENTS"}
                  </Text>
                </TouchableOpacity>
              </View>

              {isExpanded && (
                <View style={{ marginTop: 12, gap: 8 }}>
                  {themePack.cosmetics.map((cosmetic) => {
                    const isOwned = isCosmeticOwned(cosmetic.id);
                    const isEquipped = equippedThemeCosmeticId === cosmetic.id;
                    const canApply = isOwned && !isEquipped;
                    const applyLabel = isEquipped ? "EQUIPPED" : "USE";
                    const previewTheme = {
                      ...DEFAULT_APP_THEME,
                      ...(cosmetic.theme ?? {}),
                    };

                    return (
                      <View
                        key={cosmetic.id}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          backgroundColor: activeTheme.surface,
                          borderWidth: 1,
                          borderColor: activeTheme.surfaceAlt,
                        }}
                      >
                        <Text
                          style={[
                            styles.modeCardTitle,
                            { color: activeTheme.cardText },
                          ]}
                        >
                          {cosmetic.name}
                        </Text>
                        <Text
                          style={[
                            styles.modeCardBody,
                            { color: activeTheme.cardMutedText },
                          ]}
                        >
                          Theme
                        </Text>

                        <View
                          style={{
                            marginTop: 6,
                            padding: 8,
                            borderRadius: 8,
                            backgroundColor: previewTheme.background,
                            borderWidth: 1,
                            borderColor: previewTheme.surfaceAlt,
                            gap: 6,
                            overflow: "hidden",
                          }}
                        >
                          {previewTheme.appTextureSource && (
                            <Image
                              source={previewTheme.appTextureSource}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                              }}
                              resizeMode="cover"
                            />
                          )}
                          <View
                            style={{
                              height: 16,
                              borderRadius: 6,
                              backgroundColor: previewTheme.surfaceAlt,
                            }}
                          />
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <View
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: previewTheme.primary,
                              }}
                            />
                            <View
                              style={{
                                width: 36,
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: previewTheme.text,
                              }}
                            />
                          </View>
                        </View>

                        {isOwned && (
                          <TouchableOpacity
                            style={[
                              styles.modeCardButton,
                              {
                                marginTop: 6,
                                backgroundColor: isOwned
                                  ? activeTheme.primary
                                  : activeTheme.surfaceAlt,
                              },
                              (!canApply || !isOwned) &&
                                styles.modeCardButtonDisabled,
                            ]}
                            onPress={() => onApplyCosmetic(cosmetic)}
                            disabled={!canApply}
                          >
                            <Text
                              style={[
                                styles.modeCardButtonText,
                                {
                                  color: isOwned
                                    ? "white"
                                    : activeTheme.mutedText,
                                },
                              ]}
                            >
                              {applyLabel}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
          Packs
        </Text>
        {levelPackItems.map((levelPack) => {
          if (levelPack.defaultOwned) return null;
          const coinPrice = levelPack.price ?? 0;

          const isOwned =
            levelPack.owned ||
            levelPack.defaultOwned ||
            (levelPack.storeItemId
              ? purchasedStoreItemIds.has(levelPack.storeItemId)
              : false);
          const cannotAffordCoins =
            !isOwned && levelPack.priceType === "coins" && coins < coinPrice;
          const levelPackPriceLabel =
            levelPack.priceType === "real-money"
              ? (levelPackPriceLabels[levelPack.id] ?? "Loading...")
              : `${coinPrice} coins`;

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
                    opacity:
                      (levelPack.priceType === "coins" && coins < coinPrice) ||
                      isOwned
                        ? 0.8
                        : 1,
                  },
                ]}
                onPress={() => onBuyLevelPack(levelPack)}
                disabled={isOwned || (!isOwned && cannotAffordCoins)}
              >
                <Text style={[styles.modeCardButtonText, { color: "white" }]}>
                  {isOwned ? "OWNED" : levelPackPriceLabel}
                </Text>
              </TouchableOpacity>
            </View>
          );
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
        </View>
        {coinPacks.map((coinPack) => {
          const localizedPrice =
            coinPackPriceLabels[coinPack.id] ?? "Loading...";

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
                  {localizedPrice}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
      <PurchaseCelebrationBurst triggerToken={purchaseCelebrationToken} />
    </View>
  );
}
