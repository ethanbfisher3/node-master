import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Zap } from "lucide-react-native";
import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics";
import { styles } from "../styles";
import { ScrollView } from "react-native-gesture-handler";

type TrialDuration = 30 | 60 | 120;

type TimeTrialScreenProps = {
  onBack: () => void;
  onStartTrial: (nodeCount: number, duration: TrialDuration) => void;
  theme?: AppThemePalette;
};

const NODE_COUNTS = Array.from({ length: 11 }, (_, index) => index + 5);
const DURATIONS: TrialDuration[] = [30, 60, 120];

function labelForDuration(seconds: TrialDuration): string {
  if (seconds === 30) return "30 SEC";
  if (seconds === 60) return "1 MIN";
  return "2 MIN";
}

export function TimeTrialScreen({
  onBack,
  onStartTrial,
  theme,
}: TimeTrialScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME;

  return (
    <ScrollView
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
          TIME TRIAL
        </Text>
      </View>

      <View style={styles.timeTrialContainer}>
        {NODE_COUNTS.map((nodeCount) => (
          <View
            key={nodeCount}
            style={[
              styles.timeTrialDifficultyCard,
              { backgroundColor: activeTheme.surface },
            ]}
          >
            <View style={styles.modeCardHeader}>
              <Zap size={20} color={activeTheme.primary} />
              <Text style={[styles.modeCardTitle, { color: activeTheme.text }]}>
                {nodeCount} NODES
              </Text>
            </View>
            <View style={styles.timeTrialDurationsRow}>
              {DURATIONS.map((duration) => (
                <TouchableOpacity
                  key={`${nodeCount}-${duration}`}
                  style={[
                    styles.timeTrialDurationButton,
                    { backgroundColor: activeTheme.surfaceAlt },
                  ]}
                  onPress={() => onStartTrial(nodeCount, duration)}
                >
                  <Text
                    style={[
                      styles.timeTrialDurationText,
                      { color: activeTheme.text },
                    ]}
                  >
                    {labelForDuration(duration)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
