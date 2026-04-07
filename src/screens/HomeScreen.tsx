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

import { styles } from "../styles"

type HomeScreenProps = {
  coins: number
  onSelectLevels: () => void
  onDailyWeekly: () => void
  onTimeTrial: () => void
  onStore: () => void
  onAdmin?: () => void
  onSettings: () => void
}

export function HomeScreen({
  coins,
  onSelectLevels,
  onDailyWeekly,
  onTimeTrial,
  onStore,
  onAdmin,
  onSettings,
}: HomeScreenProps) {
  return (
    <View style={styles.homeContainer}>
      <View
        style={[styles.logoContainer, { transform: [{ rotate: "12deg" }] }]}
      >
        <View style={styles.logoCircle} />
        <View
          style={[
            styles.logoCircle,
            { transform: [{ rotate: "45deg" }, { translateX: 15 }] },
          ]}
        />
      </View>

      <Text style={styles.title}>NODE{"\n"}MASTER</Text>
      <Text style={styles.subtitle}>The most satisfying puzzle</Text>

      <View style={styles.coinBadge}>
        <Coins size={20} color="#F59E0B" fill="#F59E0B" />
        <Text style={styles.coinText}>{coins}</Text>
      </View>

      <TouchableOpacity style={styles.mainButton} onPress={onSelectLevels}>
        <LayoutGrid size={24} color="white" />
        <Text style={styles.mainButtonText}>SELECT LEVEL</Text>
      </TouchableOpacity>

      <View style={styles.homeMenuGrid}>
        <TouchableOpacity style={styles.homeMenuButton} onPress={onDailyWeekly}>
          <SunMoon size={20} color="#2563eb" />
          <Text style={styles.homeMenuButtonTitle}>
            DAILY/WEEKLY CHALLENGES
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeMenuButton} onPress={onTimeTrial}>
          <Bolt size={20} color="#2563eb" />
          <Text style={styles.homeMenuButtonTitle}>TIME TRIAL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeMenuButton} onPress={onStore}>
          <ShoppingBag size={20} color="#2563eb" />
          <Text style={styles.homeMenuButtonTitle}>STORE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeMenuButton} onPress={onSettings}>
          <Feather name="settings" size={20} color="#2563eb" />
          <Text style={styles.homeMenuButtonTitle}>SETTINGS</Text>
        </TouchableOpacity>
        {/* {onAdmin && (
          <TouchableOpacity style={styles.homeMenuButton} onPress={onAdmin}>
            <Hammer size={20} color="#2563eb" />
            <Text style={styles.homeMenuButtonTitle}>ADMIN (DEV)</Text>
          </TouchableOpacity>
        )} */}
      </View>
    </View>
  )
}
