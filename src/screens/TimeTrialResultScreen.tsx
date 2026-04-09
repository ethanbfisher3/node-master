import React from "react"
import { Share, Text, TouchableOpacity, View } from "react-native"
import { ChevronLeft, Share2, Trophy } from "lucide-react-native"

import { styles } from "../styles"
import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics"

const APP_DEEP_LINK = "nodemaster://home"
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.ethanbfisher3.node_master"

type TimeTrialResultScreenProps = {
  solvedCount: number
  earnedCoins: number
  nodeCount: number | null
  durationSeconds: number
  theme?: AppThemePalette
  onHome: () => void
  onPlayAgain: () => void
}

export function TimeTrialResultScreen({
  solvedCount,
  earnedCoins,
  nodeCount,
  durationSeconds,
  theme,
  onHome,
  onPlayAgain,
}: TimeTrialResultScreenProps) {
  const nodeCountLabel = nodeCount === null ? "Unknown" : String(nodeCount)
  const activeTheme = theme ?? DEFAULT_APP_THEME

  const handleShareScore = async () => {
    try {
      const message = `I just solved ${solvedCount} puzzles in Node Master Time Trial (${nodeCountLabel} nodes, ${durationSeconds}s)! Can you beat my score?\n\nOpen in app: ${APP_DEEP_LINK}\nGet it on Google Play: ${PLAY_STORE_URL}`
      await Share.share({
        message,
        title: "Node Master Time Trial Result",
      })
    } catch {
      // Ignore share-sheet failures so the result flow is uninterrupted.
    }
  }

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
          <Text style={styles.rewardLabel}>Node Count</Text>
          <Text style={styles.rewardValue}>{nodeCountLabel}</Text>
        </View>
        <View style={styles.rewardRow}>
          <Text style={styles.rewardLabel}>Time</Text>
          <Text style={styles.rewardValue}>{durationSeconds}s</Text>
        </View>
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
          style={[
            styles.nextButton,
            {
              backgroundColor: activeTheme.surfaceAlt,
            },
          ]}
          onPress={onHome}
        >
          <ChevronLeft size={24} color={activeTheme.text} />
          <Text style={[styles.nextButtonText, { color: activeTheme.text }]}>
            HOME
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={onPlayAgain}>
          <Text style={[styles.nextButtonText]}>TRY AGAIN</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.nextButton, { marginTop: 14, width: "100%" }]}
        onPress={handleShareScore}
      >
        <Share2 size={22} color="white" />
        <Text style={styles.nextButtonText}>SHARE SCORE</Text>
      </TouchableOpacity>
    </View>
  )
}
