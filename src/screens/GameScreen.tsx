import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import Svg, { Line } from "react-native-svg"
import { ArrowLeft, Coins, LayoutGrid, RotateCcw } from "lucide-react-native"

import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics"
import { DraggableNode } from "../components/DraggableNode"
import { styles } from "../styles"
import { Link, Node } from "../utils/gameLogic"

type GameScreenProps = {
  level: number
  coins: number
  nodes: Node[]
  links: Link[]
  intersectingLinks: Set<string>
  moves: number
  trialTimeLeftSeconds?: number
  noAdsOwned: boolean
  theme?: AppThemePalette
  onBackHome: () => void
  onOpenLevels: () => void
  onRestart: () => void
  onNodeDrag: (id: string, x: number, y: number) => void
  onNodeDragEnd: (id: string, x: number, y: number) => void
}

export function GameScreen({
  level,
  coins,
  nodes,
  links,
  intersectingLinks,
  moves,
  trialTimeLeftSeconds,
  noAdsOwned,
  theme,
  onBackHome,
  onOpenLevels,
  onRestart,
  onNodeDrag,
  onNodeDragEnd,
}: GameScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME

  return (
    <View
      style={[
        styles.gameContainer,
        { backgroundColor: activeTheme.background },
      ]}
    >
      <View style={styles.gameHeader}>
        <View style={styles.gameHeaderLeft}>
          <TouchableOpacity
            onPress={onBackHome}
            style={[
              styles.gameIconButton,
              { backgroundColor: activeTheme.surfaceAlt },
            ]}
          >
            <ArrowLeft size={20} color={activeTheme.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenLevels}
            style={[
              styles.gameIconButton,
              { backgroundColor: activeTheme.surfaceAlt },
            ]}
          >
            <LayoutGrid size={20} color={activeTheme.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRestart}
            style={[
              styles.gameIconButton,
              { backgroundColor: activeTheme.surfaceAlt },
            ]}
          >
            <RotateCcw size={20} color={activeTheme.mutedText} />
          </TouchableOpacity>
        </View>

        <View style={styles.levelIndicator}>
          <Text
            style={[
              styles.levelIndicatorLabel,
              { color: activeTheme.mutedText },
            ]}
          >
            Level
          </Text>
          <Text
            style={[styles.levelIndicatorValue, { color: activeTheme.text }]}
          >
            {level}
          </Text>
        </View>

        <View style={styles.gameCoinBadge}>
          <Coins size={16} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.gameCoinText}>{coins}</Text>
        </View>
      </View>

      <View
        style={[
          styles.board,
          {
            backgroundColor: activeTheme.surfaceAlt,
            borderColor: activeTheme.surfaceAlt,
          },
        ]}
      >
        <Svg style={styles.boardSvg}>
          {links.map((link) => {
            const n1 = nodes.find((node) => node.id === link.node1Id)!
            const n2 = nodes.find((node) => node.id === link.node2Id)!
            const isIntersecting = intersectingLinks.has(link.id)

            return (
              <Line
                key={link.id}
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke={isIntersecting ? "#EF4444" : "#10B981"}
                strokeWidth={isIntersecting ? 6 : 4}
                strokeLinecap="round"
              />
            )
          })}
        </Svg>

        {nodes.map((node) => (
          <View key={node.id}>
            <DraggableNode
              node={node}
              onDrag={onNodeDrag}
              onDragEnd={onNodeDragEnd}
            />
          </View>
        ))}
      </View>

      <View style={styles.gameFooter}>
        <Text style={[styles.movesText, { color: activeTheme.mutedText }]}>
          Moves: {moves}
        </Text>
        {typeof trialTimeLeftSeconds === "number" && (
          <Text style={styles.trialTimerText}>
            Time Left: {trialTimeLeftSeconds}s
          </Text>
        )}
        <Text style={[styles.hintText, { color: activeTheme.mutedText }]}>
          Drag nodes to untangle. Green links are clear!
        </Text>
      </View>
    </View>
  )
}
