import React, { useMemo } from "react";
import { ScrollView, SectionList, Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics";
import { PRE_GENERATED_LEVELS } from "../data/levels";
import { styles } from "../styles";

type LevelsScreenProps = {
  currentLevel: number;
  completedLevelIds: Set<number>;
  title?: string;
  levelIds?: number[];
  levelStarCounts?: Map<number, number>;
  sections?: Array<{
    title: string;
    levelIds: number[];
    onStartLevel: (levelId: number) => void;
    completedLevelIds?: Set<number>;
  }>;
  showNodeHeaders?: boolean;
  onBack: () => void;
  onStartLevel: (levelId: number) => void;
  theme?: AppThemePalette;
};

const NODE_COUNTS = Array.from({ length: 11 }, (_, index) => index + 5);
const BUTTONS_PER_ROW = 5;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

type LevelButtonItemProps = {
  levelId: number;
  isCompleted: boolean;
  isCurrent: boolean;
  stars: number;
  theme: AppThemePalette;
  onPress: () => void;
};

const LevelButtonItem = React.memo(function LevelButtonItem({
  levelId,
  isCompleted,
  isCurrent,
  stars,
  theme,
  onPress,
}: LevelButtonItemProps) {
  return isCompleted ? (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.levelButton,
        styles.levelButtonCompleted,
        isCurrent && styles.levelButtonCurrent,
        { height: 60 },
      ]}
    >
      <Text style={styles.levelButtonTextCompleted}>{levelId}</Text>
      {stars > 0 && (
        <Text style={{ fontSize: 9, color: "#166534", lineHeight: 12, letterSpacing: 1 }}>
          {stars >= 1 ? "★" : "☆"}{stars >= 2 ? "★" : "☆"}{stars >= 3 ? "★" : "☆"}
        </Text>
      )}
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.levelButton, { backgroundColor: theme.surface }]}
    >
      <Text style={[styles.levelButtonText, { color: theme.mutedText }]}>
        {levelId}
      </Text>
    </TouchableOpacity>
  );
});

export function LevelsScreen({
  currentLevel,
  completedLevelIds,
  title = "LEVELS",
  levelIds,
  levelStarCounts,
  sections,
  showNodeHeaders = true,
  onBack,
  onStartLevel,
  theme,
}: LevelsScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME;
  const levelsToRender = useMemo(
    () => levelIds ?? PRE_GENERATED_LEVELS.map((levelEntry) => levelEntry.id),
    [levelIds],
  );

  const levelsToRenderSet = useMemo(
    () => new Set(levelsToRender),
    [levelsToRender],
  );

  const levelsByNodeCount = useMemo(() => {
    const grouped = new Map<number, number[]>();

    for (const level of PRE_GENERATED_LEVELS) {
      if (!levelsToRenderSet.has(level.id)) {
        continue;
      }

      const nodeCount = level.nodes.length;
      const existing = grouped.get(nodeCount);
      if (existing) {
        existing.push(level.id);
      } else {
        grouped.set(nodeCount, [level.id]);
      }
    }

    return grouped;
  }, [levelsToRenderSet]);

  const sectionListData = useMemo(
    () =>
      NODE_COUNTS.flatMap((nodeCount) => {
        const ids = levelsByNodeCount.get(nodeCount) ?? [];
        if (ids.length === 0) return [];
        return [
          {
            key: `nc-${nodeCount}`,
            title: `${nodeCount} nodes`,
            data: chunkArray(ids, BUTTONS_PER_ROW),
          },
        ];
      }),
    [levelsByNodeCount],
  );

  return (
    <View
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
          {title}
        </Text>
      </View>

      {showNodeHeaders ? (
        <SectionList
          style={styles.levelsScroll}
          sections={sectionListData}
          keyExtractor={(rowIds, index) =>
            `row-${rowIds[0] ?? index}-${index}`
          }
          renderItem={({ item: rowIds }) => (
            <View style={styles.levelGrid}>
              {rowIds.map((levelId) => (
                <LevelButtonItem
                  key={levelId}
                  levelId={levelId}
                  isCompleted={completedLevelIds.has(levelId)}
                  isCurrent={levelId === currentLevel}
                  stars={levelStarCounts?.get(levelId) ?? 0}
                  theme={activeTheme}
                  onPress={() => onStartLevel(levelId)}
                />
              ))}
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.difficultyHeader}>
              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: activeTheme.surfaceAlt },
                ]}
              >
                <Text
                  style={[
                    styles.difficultyBadgeText,
                    { color: activeTheme.text },
                  ]}
                >
                  {section.title}
                </Text>
              </View>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: activeTheme.surfaceAlt },
                ]}
              />
            </View>
          )}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      ) : (
        <ScrollView
          style={styles.levelsScroll}
          showsVerticalScrollIndicator={false}
        >
          {sections ? (
            sections.map((section) => (
              <View key={section.title} style={styles.difficultySection}>
                <View style={styles.difficultyHeader}>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: activeTheme.surfaceAlt },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyBadgeText,
                        { color: activeTheme.text },
                      ]}
                    >
                      {section.title}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: activeTheme.surfaceAlt },
                    ]}
                  />
                </View>
                <View style={styles.levelGrid}>
                  {section.levelIds.map((levelId) => {
                    const completedIds =
                      section.completedLevelIds ?? completedLevelIds;
                    return completedIds.has(levelId) ? (
                      <TouchableOpacity
                        key={levelId}
                        onPress={() => section.onStartLevel(levelId)}
                        style={[
                          styles.levelButton,
                          styles.levelButtonCompleted,
                          levelId === currentLevel && styles.levelButtonCurrent,
                        ]}
                      >
                        <Text style={styles.levelButtonTextCompleted}>
                          {levelId}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        key={levelId}
                        onPress={() => section.onStartLevel(levelId)}
                        style={[
                          styles.levelButton,
                          { backgroundColor: activeTheme.surface },
                        ]}
                      >
                        <Text
                          style={[
                            styles.levelButtonText,
                            { color: activeTheme.mutedText },
                          ]}
                        >
                          {levelId}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.levelGrid}>
              {levelsToRender.map((levelId) =>
                completedLevelIds.has(levelId) ? (
                  <TouchableOpacity
                    key={levelId}
                    onPress={() => onStartLevel(levelId)}
                    style={[
                      styles.levelButton,
                      styles.levelButtonCompleted,
                      levelId === currentLevel && styles.levelButtonCurrent,
                    ]}
                  >
                    <Text style={styles.levelButtonTextCompleted}>{levelId}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    key={levelId}
                    onPress={() => onStartLevel(levelId)}
                    style={[
                      styles.levelButton,
                      { backgroundColor: activeTheme.surface },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelButtonText,
                        { color: activeTheme.mutedText },
                      ]}
                    >
                      {levelId}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
