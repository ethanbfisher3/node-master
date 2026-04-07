import React, { useEffect, useState } from "react"
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native"
import {
  ArrowLeft,
  Settings2,
  Volume2,
  Smartphone,
  Eye,
} from "lucide-react-native"

import { styles } from "../styles"
import { storageGetItem, storageSetItem } from "../utils/appStorage"

type SettingsScreenProps = {
  onBack: () => void
}

const SETTINGS_STORAGE_KEY = "node-master.settings"

type PersistedSettings = {
  soundEnabled: boolean
  hapticsEnabled: boolean
  highContrastMode: boolean
}

const DEFAULT_SETTINGS: PersistedSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  highContrastMode: false,
}

function parseSettings(rawValue: string | null): PersistedSettings {
  if (!rawValue) {
    return DEFAULT_SETTINGS
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedSettings>

    return {
      soundEnabled:
        typeof parsed.soundEnabled === "boolean"
          ? parsed.soundEnabled
          : DEFAULT_SETTINGS.soundEnabled,
      hapticsEnabled:
        typeof parsed.hapticsEnabled === "boolean"
          ? parsed.hapticsEnabled
          : DEFAULT_SETTINGS.hapticsEnabled,
      highContrastMode:
        typeof parsed.highContrastMode === "boolean"
          ? parsed.highContrastMode
          : DEFAULT_SETTINGS.highContrastMode,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULT_SETTINGS)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false

    const hydrateSettings = async () => {
      const rawValue = await storageGetItem(SETTINGS_STORAGE_KEY)
      if (cancelled) {
        return
      }

      setSettings(parseSettings(rawValue))
      setIsHydrated(true)
    }

    void hydrateSettings()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    void storageSetItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  }, [isHydrated, settings])

  return (
    <View style={styles.levelsContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
      </View>

      <ScrollView
        style={styles.levelsScroll}
        contentContainerStyle={styles.settingsScrollContent}
      >
        <View style={styles.modeCard}>
          <View style={styles.modeCardHeader}>
            <Settings2 size={18} color="#2563eb" />
            <Text style={styles.modeCardTitle}>GAMEPLAY</Text>
          </View>
          <Text style={styles.modeCardBody}>
            Choose your preferred experience. These settings are saved on your
            device.
          </Text>

          <View style={styles.settingsItem}>
            <View style={styles.settingsItemTextContainer}>
              <View style={styles.modeCardHeader}>
                <Volume2 size={16} color="#0f172a" />
                <Text style={styles.settingsItemTitle}>Sound Effects</Text>
              </View>
              <Text style={styles.settingsItemDescription}>
                Play UI and completion sounds.
              </Text>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, soundEnabled: value }))
              }
              trackColor={{ false: "#cbd5e1", true: "#60a5fa" }}
              thumbColor={settings.soundEnabled ? "#2563eb" : "#94a3b8"}
            />
          </View>

          <View style={styles.settingsDivider} />

          <View style={styles.settingsItem}>
            <View style={styles.settingsItemTextContainer}>
              <View style={styles.modeCardHeader}>
                <Smartphone size={16} color="#0f172a" />
                <Text style={styles.settingsItemTitle}>Haptic Feedback</Text>
              </View>
              <Text style={styles.settingsItemDescription}>
                Vibrate lightly when nodes snap into place.
              </Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, hapticsEnabled: value }))
              }
              trackColor={{ false: "#cbd5e1", true: "#60a5fa" }}
              thumbColor={settings.hapticsEnabled ? "#2563eb" : "#94a3b8"}
            />
          </View>

          <View style={styles.settingsDivider} />

          <View style={styles.settingsItem}>
            <View style={styles.settingsItemTextContainer}>
              <View style={styles.modeCardHeader}>
                <Eye size={16} color="#0f172a" />
                <Text style={styles.settingsItemTitle}>High Contrast Mode</Text>
              </View>
              <Text style={styles.settingsItemDescription}>
                Increase visual contrast for easier node tracking.
              </Text>
            </View>
            <Switch
              value={settings.highContrastMode}
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, highContrastMode: value }))
              }
              trackColor={{ false: "#cbd5e1", true: "#60a5fa" }}
              thumbColor={settings.highContrastMode ? "#2563eb" : "#94a3b8"}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
