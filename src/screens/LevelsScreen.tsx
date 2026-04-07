import React from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { ArrowLeft, Star } from "lucide-react-native"

import { PRE_GENERATED_LEVELS } from "../data/levels"
import { styles } from "../styles"

type LevelsScreenProps = {
  currentLevel: number
  completedLevelIds: Set<number>
  title?: string
  levelIds?: number[]
  sections?: Array<{
    title: string
    levelIds: number[]
    onStartLevel: (levelId: number) => void
    completedLevelIds?: Set<number>
  }>
  showNodeHeaders?: boolean
  onBack: () => void
  onStartLevel: (levelId: number) => void
}

const NODE_COUNTS = Array.from({ length: 11 }, (_, index) => index + 5)

export function LevelsScreen({
  currentLevel,
  completedLevelIds,
  title = "LEVELS",
  levelIds,
  sections,
  showNodeHeaders = true,
  onBack,
  onStartLevel,
}: LevelsScreenProps) {
  const levelsToRender =
    levelIds ?? PRE_GENERATED_LEVELS.map((levelEntry) => levelEntry.id)

  const renderLevelButton = (
    levelId: number,
    startLevel: (levelId: number) => void = onStartLevel,
    completedIds: Set<number> = completedLevelIds,
  ) =>
    completedIds.has(levelId) ? (
      <TouchableOpacity
        key={levelId}
        onPress={() => startLevel(levelId)}
        style={[
          styles.levelButton,
          styles.levelButtonCompleted,
          levelId === currentLevel && styles.levelButtonCurrent,
        ]}
      >
        <Star size={14} color="#166534" fill="#166534" />
        <Text style={styles.levelButtonTextCompleted}>{levelId}</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        key={levelId}
        onPress={() => startLevel(levelId)}
        style={[styles.levelButton]}
      >
        <Text style={[styles.levelButtonText]}>{levelId}</Text>
      </TouchableOpacity>
    )

  return (
    <View style={styles.levelsContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <ScrollView
        style={styles.levelsScroll}
        showsVerticalScrollIndicator={false}
      >
        {showNodeHeaders ? (
          NODE_COUNTS.map((nodeCount) => {
            const filteredLevels = PRE_GENERATED_LEVELS.filter(
              (level) =>
                level.nodes.length === nodeCount &&
                levelsToRender.includes(level.id),
            )

            return (
              <View key={nodeCount} style={styles.difficultySection}>
                <View style={styles.difficultyHeader}>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: "#dbeafe" },
                    ]}
                  >
                    <Text
                      style={[styles.difficultyBadgeText, { color: "#1d4ed8" }]}
                    >
                      {nodeCount} nodes
                    </Text>
                  </View>
                  <View style={styles.divider} />
                </View>
                <View style={styles.levelGrid}>
                  {filteredLevels.map((level) => renderLevelButton(level.id))}
                </View>
              </View>
            )
          })
        ) : sections ? (
          sections.map((section) => (
            <View key={section.title} style={styles.difficultySection}>
              <View style={styles.difficultyHeader}>
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: "#dbeafe" },
                  ]}
                >
                  <Text
                    style={[styles.difficultyBadgeText, { color: "#1d4ed8" }]}
                  >
                    {section.title}
                  </Text>
                </View>
                <View style={styles.divider} />
              </View>
              <View style={styles.levelGrid}>
                {section.levelIds.map((levelId) =>
                  renderLevelButton(
                    levelId,
                    section.onStartLevel,
                    section.completedLevelIds ?? completedLevelIds,
                  ),
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.levelGrid}>
            {levelsToRender.map((levelId) => renderLevelButton(levelId))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}
