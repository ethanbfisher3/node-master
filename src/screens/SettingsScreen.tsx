import React, { useEffect, useState } from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import {
  ArrowLeft,
  Settings2,
  Volume2,
  Smartphone,
  Eye,
} from "lucide-react-native";

import { styles } from "../styles";
import {
  DEFAULT_SETTINGS,
  PersistedSettings,
  readSettings,
  writeSettings,
} from "../utils/settings";
import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics";

type SettingsScreenProps = {
  onBack: () => void;
  theme: AppThemePalette | null;
};

export function SettingsScreen({ onBack, theme }: SettingsScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME;
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateSettings = async () => {
      if (cancelled) {
        return;
      }

      const nextSettings = await readSettings();
      if (cancelled) {
        return;
      }

      setSettings(nextSettings);
      setIsHydrated(true);
    };

    void hydrateSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void writeSettings(settings);
  }, [isHydrated, settings]);

  return (
    <View style={styles.levelsContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: activeTheme.cardText }]}>
          SETTINGS
        </Text>
      </View>

      <ScrollView
        style={styles.levelsScroll}
        contentContainerStyle={styles.settingsScrollContent}
      >
        <View
          style={[styles.modeCard, { backgroundColor: activeTheme.surfaceAlt }]}
        >
          <View style={styles.modeCardHeader}>
            <Settings2 size={18} color={activeTheme.cardText} />
            <Text
              style={[styles.modeCardTitle, { color: activeTheme.cardText }]}
            >
              GAMEPLAY
            </Text>
          </View>
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemTextContainer}>
              <View style={styles.modeCardHeader}>
                <Volume2 size={16} color={activeTheme.cardText} />
                <Text
                  style={[
                    styles.settingsItemTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  Sound Effects
                </Text>
              </View>
              <Text
                style={[
                  styles.settingsItemDescription,
                  { color: activeTheme.cardText },
                ]}
              >
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
                <Smartphone size={16} color={activeTheme.cardText} />
                <Text
                  style={[
                    styles.settingsItemTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  Haptic Feedback
                </Text>
              </View>
              <Text
                style={[
                  styles.settingsItemDescription,
                  { color: activeTheme.cardText },
                ]}
              >
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
                <Eye size={16} color={activeTheme.cardText} />
                <Text
                  style={[
                    styles.settingsItemTitle,
                    { color: activeTheme.cardText },
                  ]}
                >
                  High Contrast Mode
                </Text>
              </View>
              <Text
                style={[
                  styles.settingsItemDescription,
                  { color: activeTheme.cardText },
                ]}
              >
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
  );
}
