import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, BadgeCheck, ShoppingBag } from "lucide-react-native";

import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics";
import { styles } from "../styles";
import { Cosmetic } from "../data/cosmetics";
import levelPacks from "../data/levelPacks";

type StoreScreenProps = {
  coins: number;
  noAdsOwned: boolean;
  noAdsPrice: number;
  cosmetics: Cosmetic[];
  purchasedStoreItemIds: Set<string>;
  equippedCosmeticId: string | null;
  onBack: () => void;
  onBuyNoAds: () => void;
  onBuyCosmetic: (cosmetic: Cosmetic) => void;
  onApplyCosmetic: (cosmeticId: string | null) => void;
  theme?: AppThemePalette;
};

export function StoreScreen({
  coins,
  noAdsOwned,
  noAdsPrice,
  cosmetics,
  purchasedStoreItemIds,
  equippedCosmeticId,
  onBack,
  onBuyNoAds,
  onBuyCosmetic,
  onApplyCosmetic,
  theme,
}: StoreScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME;

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
            <ShoppingBag size={20} color={activeTheme.primary} />
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
          <Text
            style={[
              styles.modeCardBody,
              { color: DEFAULT_APP_THEME.cardMutedText },
            ]}
          >
            The original app colors. Always owned.
          </Text>

          <TouchableOpacity
            style={[
              styles.modeCardButton,
              equippedCosmeticId === null && styles.modeCardButtonDisabled,
              {
                backgroundColor: DEFAULT_APP_THEME.primary,
              },
            ]}
            onPress={() => onApplyCosmetic(null)}
            disabled={equippedCosmeticId === null}
          >
            <Text style={styles.modeCardButtonText}>
              {equippedCosmeticId === null ? "EQUIPPED" : "APPLY"}
            </Text>
          </TouchableOpacity>
        </View>
        {cosmetics.map((cosmetic) => {
          const cosmeticItemKey = `cosmetic:${cosmetic.id}`;
          const isOwned = purchasedStoreItemIds.has(cosmeticItemKey);
          const isEquipped = isOwned && equippedCosmeticId === cosmetic.id;
          const cannotAffordCoins =
            cosmetic.priceType === "coins" && coins < cosmetic.price;
          const previewTheme = { ...DEFAULT_APP_THEME, ...cosmetic.theme };

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
              <Text
                style={[
                  styles.modeCardBody,
                  { color: previewTheme.cardMutedText },
                ]}
              >
                {cosmetic.description}
              </Text>

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
                  isOwned
                    ? onApplyCosmetic(cosmetic.id)
                    : onBuyCosmetic(cosmetic)
                }
                disabled={
                  (isOwned && isEquipped) || (!isOwned && cannotAffordCoins)
                }
              >
                <Text style={[styles.modeCardButtonText, { color: "white" }]}>
                  {isOwned
                    ? isEquipped
                      ? "EQUIPPED"
                      : "APPLY"
                    : cosmetic.priceType === "coins"
                      ? `${cosmetic.price} coins`
                      : `$${cosmetic.price.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
        <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
          Packs
        </Text>
        {levelPacks.map((levelPack) => {
          const packItemKey = `levelPack:${levelPack.id}`;
          const isOwned = purchasedStoreItemIds.has(packItemKey);
          const isEquipped = isOwned && equippedCosmeticId === levelPack.id;
          const cannotAffordCoins =
            levelPack.priceType === "coins" && coins < levelPack.price;

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
                <ShoppingBag size={20} color={activeTheme.primary} />
                <Text
                  style={[
                    styles.modeCardTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  {levelPack.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.modeCardBody,
                  { color: activeTheme.cardMutedText },
                ]}
              >
                {levelPack.description}
              </Text>

              <TouchableOpacity
                style={[
                  styles.modeCardButton,
                  ((isOwned && isEquipped) ||
                    (!isOwned && cannotAffordCoins)) &&
                    styles.modeCardButtonDisabled,
                  {
                    backgroundColor: activeTheme.primary,
                    opacity: coins >= levelPack.price ? 1 : 0.8,
                  },
                ]}
                onPress={() => {}}
                disabled={
                  (isOwned && isEquipped) || (!isOwned && cannotAffordCoins)
                }
              >
                <Text style={[styles.modeCardButtonText, { color: "white" }]}>
                  {isOwned
                    ? isEquipped
                      ? "EQUIPPED"
                      : "APPLY"
                    : levelPack.priceType === "coins"
                      ? `${levelPack.price} coins`
                      : `$${levelPack.price.toFixed(2)}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
