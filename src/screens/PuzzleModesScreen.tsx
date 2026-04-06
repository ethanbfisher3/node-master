import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, Calendar, CalendarDays, Play } from "lucide-react-native";

import { styles } from "../styles";

type PuzzleModesScreenProps = {
  onBack: () => void;
  onStartDaily: () => void;
  onStartWeekly: () => void;
};

export function PuzzleModesScreen({
  onBack,
  onStartDaily,
  onStartWeekly,
}: PuzzleModesScreenProps) {
  return (
    <View style={styles.levelsContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DAILY AND WEEKLY</Text>
      </View>

      <View style={styles.modeCardList}>
        <View style={styles.modeCard}>
          <View style={styles.modeCardHeader}>
            <Calendar size={20} color="#2563eb" />
            <Text style={styles.modeCardTitle}>DAILY PUZZLES</Text>
          </View>
          <Text style={styles.modeCardBody}>10 fresh puzzles each day.</Text>
          <TouchableOpacity
            style={styles.modeCardButton}
            onPress={onStartDaily}
          >
            <Play size={18} color="white" />
            <Text style={styles.modeCardButtonText}>START DAILY</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modeCard}>
          <View style={styles.modeCardHeader}>
            <CalendarDays size={20} color="#2563eb" />
            <Text style={styles.modeCardTitle}>WEEKLY PUZZLES</Text>
          </View>
          <Text style={styles.modeCardBody}>
            50 challenge puzzles each week.
          </Text>
          <TouchableOpacity
            style={styles.modeCardButton}
            onPress={onStartWeekly}
          >
            <Play size={18} color="white" />
            <Text style={styles.modeCardButtonText}>START WEEKLY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
