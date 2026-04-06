import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft, Trophy } from "lucide-react-native";

import { styles } from "../styles";

type TimeTrialResultScreenProps = {
  solvedCount: number;
  earnedCoins: number;
  onHome: () => void;
  onPlayAgain: () => void;
};

export function TimeTrialResultScreen({
  solvedCount,
  earnedCoins,
  onHome,
  onPlayAgain,
}: TimeTrialResultScreenProps) {
  return (
    <View style={styles.completeContainer}>
      <View style={styles.trophyContainer}>
        <Trophy size={48} color="white" />
      </View>

      <Text style={styles.completeTitle}>TIME TRIAL OVER</Text>
      <Text style={styles.completeSubtitle}>
        You solved {solvedCount} puzzles
      </Text>

      <View style={styles.rewardCard}>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>Puzzles Cleared</Text>
          <Text style={styles.rewardValue}>{solvedCount}</Text>
        </View>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>Coins Earned</Text>
          <Text style={styles.rewardValue}>+{earnedCoins}</Text>
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
        <TouchableOpacity style={styles.nextButton} onPress={onPlayAgain}>
          <Text style={styles.nextButtonText}>TRY AGAIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
