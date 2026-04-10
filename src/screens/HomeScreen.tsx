import React from "react"
import { Text, TouchableOpacity, View, ScrollView } from "react-native"
import {
  Hammer,
  Bolt,
  Coins,
  LayoutGrid,
  ShoppingBag,
  SunMoon,
} from "lucide-react-native"
import Feather from "@expo/vector-icons/Feather"
import FontAwesome5 from "@expo/vector-icons/FontAwesome5"
import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics"
import { styles } from "../styles"

type HomeScreenProps = {
  coins: number
  onSelectLevels: () => void
  onDailyWeekly: () => void
  onTimeTrial: () => void
  onStore: () => void
  onAdmin?: () => void
  onRestoreAppInfo?: () => void
  onSettings: () => void
  theme?: AppThemePalette
}

export function HomeScreen({
  coins,
  onSelectLevels,
  onDailyWeekly,
  onTimeTrial,
  onStore,
  onAdmin,
  onRestoreAppInfo,
  onSettings,
  theme,
}: HomeScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME

  return (
    <View
      style={[
        styles.homeContainer,
        { backgroundColor: activeTheme.background },
      ]}
    >
      <View
        style={[
          styles.logoContainer,
          {
            transform: [{ rotate: "12deg" }],
            backgroundColor: activeTheme.primary,
            shadowColor: activeTheme.primary,
          },
        ]}
      >
        <View style={styles.logoCircle} />
        <View
          style={[
            styles.logoCircle,
            { transform: [{ rotate: "45deg" }, { translateX: 15 }] },
          ]}
        />
      </View>

      <Text style={[styles.title, { color: activeTheme.text }]}>
        NODE{"\n"}MASTER
      </Text>
      <Text style={[styles.subtitle, { color: activeTheme.mutedText }]}>
        The most satisfying puzzle
      </Text>

      <View style={styles.coinBadge}>
        <Coins size={20} color="#F59E0B" fill="#F59E0B" />
        <Text style={styles.coinText}>{coins}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.mainButton,
          {
            backgroundColor: activeTheme.primary,
            shadowColor: activeTheme.primary,
          },
        ]}
        onPress={onSelectLevels}
      >
        <Text
          style={[styles.mainButtonText, { color: activeTheme.buttonText }]}
        >
          QUICK PLAY
        </Text>
        <FontAwesome5 name="play" size={24} color={activeTheme.buttonText} />
      </TouchableOpacity>

      <View style={styles.homeMenuGrid}>
        <TouchableOpacity
          style={[
            styles.homeMenuButton,
            { backgroundColor: activeTheme.surfaceAlt },
          ]}
          onPress={onDailyWeekly}
        >
          <SunMoon size={20} color={activeTheme.text} />
          <Text
            style={[styles.homeMenuButtonTitle, { color: activeTheme.text }]}
          >
            DAILY/WEEKLY CHALLENGES
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.homeMenuButton,
            { backgroundColor: activeTheme.surfaceAlt },
          ]}
          onPress={onTimeTrial}
        >
          <Bolt size={20} color={activeTheme.text} />
          <Text
            style={[styles.homeMenuButtonTitle, { color: activeTheme.text }]}
          >
            TIME TRIAL
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.homeMenuButton,
            { backgroundColor: activeTheme.surfaceAlt },
          ]}
          onPress={onStore}
        >
          <ShoppingBag size={20} color={activeTheme.text} />
          <Text
            style={[styles.homeMenuButtonTitle, { color: activeTheme.text }]}
          >
            STORE
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.homeMenuButton,
            { backgroundColor: activeTheme.surfaceAlt },
          ]}
          onPress={onSettings}
        >
          <Feather name="settings" size={20} color={activeTheme.text} />
          <Text
            style={[styles.homeMenuButtonTitle, { color: activeTheme.text }]}
          >
            SETTINGS
          </Text>
        </TouchableOpacity>
        {onRestoreAppInfo && (
          <TouchableOpacity
            style={[
              styles.homeMenuButton,
              { backgroundColor: activeTheme.surfaceAlt },
            ]}
            onPress={onRestoreAppInfo}
          >
            <Hammer size={20} color={activeTheme.text} />
            <Text
              style={[styles.homeMenuButtonTitle, { color: activeTheme.text }]}
            >
              RESTORE APP INFO
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
