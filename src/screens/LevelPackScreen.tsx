import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, CheckCircle2, Lock, Package } from "lucide-react-native";

import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics";
import { LevelPack } from "../data/levelPacks";
import { styles } from "../styles";

type SelectableLevelPack = LevelPack & {
  owned: boolean;
};

type LevelPackScreenProps = {
  packs: SelectableLevelPack[];
  onBack: () => void;
  onSelectPack: (packId: string) => void;
  theme?: AppThemePalette;
};

export function LevelPackScreen({
  packs,
  onBack,
  onSelectPack,
  theme,
}: LevelPackScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME;
  const ownedPacks = packs.filter((pack) => pack.owned);
  const purchasablePacks = packs.filter((pack) => !pack.defaultOwned);

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
          style={[styles.backButton, { backgroundColor: activeTheme.surfaceAlt }]}
        >
          <ArrowLeft size={24} color={activeTheme.mutedText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: activeTheme.text }]}>
          LEVEL PACKS
        </Text>
      </View>

      <ScrollView style={styles.levelsScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.storeScrollContent}>
          <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
            AVAILABLE PACKS
          </Text>
          {ownedPacks.map((pack) => (
            <View
              key={pack.id}
              style={[
                styles.modeCard,
                {
                  backgroundColor: activeTheme.surface,
                  borderColor: activeTheme.surfaceAlt,
                },
              ]}
            >
              <View style={styles.modeCardHeader}>
                <Package size={20} color={activeTheme.primary} />
                <Text style={[styles.modeCardTitle, { color: activeTheme.cardText }]}>
                  {pack.name}
                </Text>
              </View>
              <Text style={[styles.modeCardBody, { color: activeTheme.cardMutedText }]}>
                {pack.description}
              </Text>
              <Text style={[styles.storeBalanceText, { color: activeTheme.mutedText }]}>
                {pack.levelIds.length} levels
              </Text>
              <TouchableOpacity
                style={[styles.modeCardButton, { backgroundColor: activeTheme.primary }]}
                onPress={() => onSelectPack(pack.id)}
              >
                <CheckCircle2 size={16} color={activeTheme.buttonText} />
                <Text style={[styles.modeCardButtonText, { color: activeTheme.buttonText }]}>
                  OPEN PACK
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>BUYABLE PACKS</Text>
          {purchasablePacks.map((pack) => (
            <View
              key={pack.id}
              style={[
                styles.modeCard,
                {
                  backgroundColor: activeTheme.surface,
                  borderColor: activeTheme.surfaceAlt,
                },
              ]}
            >
              <View style={styles.modeCardHeader}>
                <Package size={20} color={activeTheme.primary} />
                <Text style={[styles.modeCardTitle, { color: activeTheme.cardText }]}>
                  {pack.name}
                </Text>
              </View>
              <Text style={[styles.modeCardBody, { color: activeTheme.cardMutedText }]}>
                {pack.description}
              </Text>
              <Text style={[styles.storeBalanceText, { color: activeTheme.mutedText }]}>
                {pack.levelIds.length} levels
              </Text>
              <View
                style={[
                  styles.modeCardButton,
                  {
                    backgroundColor: pack.owned
                      ? activeTheme.primary
                      : activeTheme.surfaceAlt,
                  },
                ]}
              >
                {pack.owned ? (
                  <CheckCircle2 size={16} color={activeTheme.buttonText} />
                ) : (
                  <Lock size={16} color={activeTheme.mutedText} />
                )}
                <Text
                  style={[
                    styles.modeCardButtonText,
                    { color: pack.owned ? activeTheme.buttonText : activeTheme.mutedText },
                  ]}
                >
                  {pack.owned ? "OWNED" : "NOT OWNED"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
