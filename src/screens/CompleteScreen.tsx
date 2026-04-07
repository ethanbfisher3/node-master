import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ChevronLeft, ChevronRight, Coins, Trophy } from "lucide-react-native";

import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics";
import { styles } from "../styles";

type CompleteScreenProps = {
  level: number;
  moves: number;
  theme?: AppThemePalette;
  onHome: () => void;
  onNextLevel: () => void;
};

export function CompleteScreen({
  level,
  moves,
  theme,
  onHome,
  onNextLevel,
}: CompleteScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME;
  const baseReward = level * 10;
  const moveBonus = Math.max(0, 50 - moves);
  const totalReward = baseReward + moveBonus;

  return (
    <View
      style={[
        styles.completeContainer,
        { backgroundColor: activeTheme.background },
      ]}
    >
      <View
        style={[
          styles.trophyContainer,
          {
            backgroundColor: activeTheme.primary,
            shadowColor: activeTheme.primary,
          },
        ]}
      >
        <Trophy size={48} color={activeTheme.buttonText} />
      </View>

      <Text style={[styles.completeTitle, { color: activeTheme.text }]}>
        WELL DONE!
      </Text>
      <Text style={[styles.completeSubtitle, { color: activeTheme.mutedText }]}>
        Level {level} completed
      </Text>

      <View
        style={[styles.rewardCard, { backgroundColor: activeTheme.surface }]}
      >
        <View style={styles.rewardRow}>
          <Text
            style={[styles.rewardLabel, { color: activeTheme.cardMutedText }]}
          >
            Base Reward
          </Text>
          <Text style={[styles.rewardValue, { color: activeTheme.cardText }]}>
            +{baseReward}
          </Text>
        </View>
        <View style={styles.rewardRow}>
          <Text
            style={[styles.rewardLabel, { color: activeTheme.cardMutedText }]}
          >
            Move Bonus
          </Text>
          <Text style={[styles.rewardValue, { color: activeTheme.cardText }]}>
            +{moveBonus}
          </Text>
        </View>
        <View
          style={[
            styles.rewardDivider,
            { backgroundColor: activeTheme.surfaceAlt },
          ]}
        />
        <View style={styles.rewardRow}>
          <Text
            style={[styles.rewardTotalLabel, { color: activeTheme.cardText }]}
          >
            Total Earned
          </Text>
          <View style={styles.rewardTotalValueContainer}>
            <Coins size={20} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.rewardTotalValue}>{totalReward}</Text>
          </View>
        </View>
      </View>

      <View style={styles.completeButtonsRow}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: activeTheme.surfaceAlt },
          ]}
          onPress={onHome}
        >
          <ChevronLeft size={24} color={activeTheme.text} />
          <Text style={[styles.nextButtonText, { color: activeTheme.text }]}>
            HOME
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextButton,
            {
              backgroundColor: activeTheme.primary,
              shadowColor: activeTheme.primary,
            },
          ]}
          onPress={onNextLevel}
        >
          <Text
            style={[styles.nextButtonText, { color: activeTheme.buttonText }]}
          >
            NEXT LEVEL
          </Text>
          <ChevronRight size={24} color={activeTheme.buttonText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
