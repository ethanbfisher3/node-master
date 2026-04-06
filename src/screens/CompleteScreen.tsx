import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft, ChevronRight, Coins, Trophy } from "lucide-react-native";

import { styles } from "../styles";

type CompleteScreenProps = {
  level: number;
  moves: number;
  onHome: () => void;
  onNextLevel: () => void;
};

export function CompleteScreen({
  level,
  moves,
  onHome,
  onNextLevel,
}: CompleteScreenProps) {
  const baseReward = level * 10;
  const moveBonus = Math.max(0, 50 - moves);
  const totalReward = baseReward + moveBonus;

  return (
    <View style={styles.completeContainer}>
      <View style={styles.trophyContainer}>
        <Trophy size={48} color="white" />
      </View>

      <Text style={styles.completeTitle}>WELL DONE!</Text>
      <Text style={styles.completeSubtitle}>Level {level} completed</Text>

      <View style={styles.rewardCard}>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>Base Reward</Text>
          <Text style={styles.rewardValue}>+{baseReward}</Text>
        </View>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>Move Bonus</Text>
          <Text style={styles.rewardValue}>+{moveBonus}</Text>
        </View>
        <View style={styles.rewardDivider} />
        <View style={styles.rewardRow}>
          <Text style={styles.rewardTotalLabel}>Total Earned</Text>
          <View style={styles.rewardTotalValueContainer}>
            <Coins size={20} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.rewardTotalValue}>{totalReward}</Text>
          </View>
        </View>
      </View>

      <View style={styles.completeButtonsRow}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: "orange" }]}
          onPress={onHome}
        >
          <ChevronLeft size={24} color="white" />
          <Text style={styles.nextButtonText}>HOME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={onNextLevel}>
          <Text style={styles.nextButtonText}>NEXT LEVEL</Text>
          <ChevronRight size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
