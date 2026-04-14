import React from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { ArrowLeft, CheckCircle2, Lock, Package } from "lucide-react-native"

import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics"
import { LevelPack } from "../data/levelPacks"
import { styles } from "../styles"
import { ViewType } from "../App"

type SelectableLevelPack = LevelPack & {
  owned: boolean
}

type LevelPackScreenProps = {
  packs: SelectableLevelPack[]
  onBack: () => void
  onSelectPack: (packId: string) => void
  goToStore: () => void
  theme?: AppThemePalette
}

export function LevelPackScreen({
  packs,
  onBack,
  onSelectPack,
  goToStore,
  theme,
}: LevelPackScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME
  const ownedPacks = packs.filter((pack) => pack.owned)
  const purchasablePacks = packs.filter((pack) => !pack.defaultOwned)

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
          Level Packs
        </Text>
      </View>

      <ScrollView
        style={styles.levelsScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.storeScrollContent}>
          <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
            AVAILABLE PACKS
          </Text>
          {packs.map((pack) => (
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
                <Package size={20} color={activeTheme.text} />
                <Text
                  style={[
                    styles.modeCardTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  {pack.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.storeBalanceText,
                  { color: activeTheme.mutedText },
                ]}
              >
                {pack.levelIds.length} levels
              </Text>
              <TouchableOpacity
                style={[
                  styles.modeCardButton,
                  { backgroundColor: activeTheme.primary },
                ]}
                onPress={() => {
                  if (pack.owned) onSelectPack(pack.id)
                  else goToStore()
                }}
              >
                {pack.owned ? (
                  <CheckCircle2 size={16} color={activeTheme.buttonText} />
                ) : (
                  <Lock size={16} color={activeTheme.buttonText} />
                )}
                <Text
                  style={[
                    styles.modeCardButtonText,
                    { color: activeTheme.buttonText },
                  ]}
                >
                  {pack.owned ? "OPEN PACK" : "BUY PACK"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
