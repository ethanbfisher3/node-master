import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Zap } from "lucide-react-native";
import { styles } from "../styles";
import { ScrollView } from "react-native-gesture-handler";

type TrialDuration = 30 | 60 | 120;

type TimeTrialScreenProps = {
  onBack: () => void;
  onStartTrial: (nodeCount: number, duration: TrialDuration) => void;
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
}: TimeTrialScreenProps) {
  return (
    <ScrollView style={styles.levelsContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TIME TRIAL</Text>
      </View>

      <View style={styles.timeTrialContainer}>
        {NODE_COUNTS.map((nodeCount) => (
          <View key={nodeCount} style={styles.timeTrialDifficultyCard}>
            <View style={styles.modeCardHeader}>
              <Zap size={20} color="#2563eb" />
              <Text style={styles.modeCardTitle}>{nodeCount} NODES</Text>
            </View>
            <View style={styles.timeTrialDurationsRow}>
              {DURATIONS.map((duration) => (
                <TouchableOpacity
                  key={`${nodeCount}-${duration}`}
                  style={styles.timeTrialDurationButton}
                  onPress={() => onStartTrial(nodeCount, duration)}
                >
                  <Text style={styles.timeTrialDurationText}>
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
