import React, { useEffect, useMemo } from "react"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import Svg, { Line } from "react-native-svg"
import { ArrowLeft, Coins, LayoutGrid, RotateCcw } from "lucide-react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics"
import {
  DraggableNode,
  type NodeVisualStyle,
} from "../components/DraggableNode"
import { styles } from "../styles"
import { Link, Node } from "../utils/gameLogic"

const CONFETTI_COLORS = [
  "#4ade80",
  "#facc15",
  "#38bdf8",
  "#fb923c",
  "#f87171",
  "#c084fc",
  "#2dd4bf",
  "#fef08a",
]

const CONFETTI_DURATION = 800

const CONFETTI_SHAPES = [
  { size: 16, borderRadius: 999 },
  { size: 18, borderRadius: 2 },
  { size: 17, borderRadius: 999 },
  { size: 15, borderRadius: 2 },
  { size: 16, borderRadius: 999 },
  { size: 18, borderRadius: 2 },
  { size: 15, borderRadius: 999 },
]

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function createConfettiVector(
  seed: string,
  nodeId: string,
  pieceIndex: number,
) {
  const hash = hashString(`${seed}:${nodeId}:${pieceIndex}`)
  const angle = ((hash % 360) * Math.PI) / 180
  const distance = 30 + (hash % 26)
  const lift = 12 + ((hash >> 3) % 12)
  const sway = ((hash >> 5) % 2 === 0 ? 1 : -1) * (8 + ((hash >> 7) % 12))

  return { angle, distance, lift, sway }
}

function getConfettiColor(seed: string, nodeId: string, pieceIndex: number) {
  const hash = hashString(`${seed}:${nodeId}:${pieceIndex}:color`)
  return CONFETTI_COLORS[hash % CONFETTI_COLORS.length]
}

type ConfettiBurstProps = {
  node: Node
  seed: string
}

function ConfettiBurst({ node, seed }: ConfettiBurstProps) {
  return (
    <>
      {CONFETTI_SHAPES.map((shape, pieceIndex) => (
        <ConfettiPiece
          key={`${node.id}-${seed}-${pieceIndex}`}
          node={node}
          seed={seed}
          pieceIndex={pieceIndex}
          shape={shape}
        />
      ))}
    </>
  )
}

type ConfettiPieceProps = {
  node: Node
  seed: string
  pieceIndex: number
  shape: { size: number; borderRadius: number }
}

function ConfettiPiece({ node, seed, pieceIndex, shape }: ConfettiPieceProps) {
  const progress = useSharedValue(0)
  const opacity = useSharedValue(1)

  useEffect(() => {
    progress.value = 0
    opacity.value = 1

    progress.value = withTiming(1, {
      duration: CONFETTI_DURATION,
      easing: Easing.out(Easing.cubic),
    })
    opacity.value = withTiming(0, {
      duration: CONFETTI_DURATION,
      easing: Easing.out(Easing.quad),
    })
  }, [opacity, progress, seed])

  const vector = useMemo(
    () => createConfettiVector(seed, node.id, pieceIndex),
    [node.id, pieceIndex, seed],
  )

  const animatedStyle = useAnimatedStyle(() => {
    const travelX = Math.cos(vector.angle) * vector.distance * progress.value
    const travelY =
      Math.sin(vector.angle) * vector.distance * progress.value -
      vector.lift * progress.value

    return {
      opacity: opacity.value,
      transform: [
        { translateX: travelX + vector.sway * progress.value },
        { translateY: travelY },
        { scale: 1 - progress.value * 0.35 },
        { rotate: `${progress.value * 140}deg` },
      ],
    }
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: node.x - shape.size / 2,
          top: node.y - shape.size / 2,
          width: shape.size,
          height: shape.size,
          borderRadius: shape.borderRadius,
          backgroundColor: getConfettiColor(seed, node.id, pieceIndex),
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 3,
          shadowOffset: { width: 0, height: 1 },
        },
        animatedStyle,
      ]}
    />
  )
}

type GameScreenProps = {
  level: number
  coins: number
  nodes: Node[]
  links: Link[]
  intersectingLinks: Set<string>
  isLevelComplete: boolean
  isNodeDragLocked: boolean
  trialTimeLeftSeconds?: number
  reverseObjective?: boolean
  noAdsOwned: boolean
  theme?: AppThemePalette
  onBackHome: () => void
  onOpenLevels: () => void
  onRestart: () => void
  onNodeDrag: (id: string, x: number, y: number) => void
  onNodeDragEnd: (id: string, x: number, y: number) => void
  onNodeDragStart: (id: string) => void
  onNodeDragFinalize: (id: string) => void
}

export function GameScreen({
  level,
  coins,
  nodes,
  links,
  intersectingLinks,
  isLevelComplete,
  isNodeDragLocked,
  trialTimeLeftSeconds,
  reverseObjective = false,
  noAdsOwned,
  theme,
  onBackHome,
  onOpenLevels,
  onRestart,
  onNodeDrag,
  onNodeDragEnd,
  onNodeDragStart,
  onNodeDragFinalize,
}: GameScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME
  const activeNodeStyle = useMemo<NodeVisualStyle>(
    () => ({
      nodeFill: activeTheme.surface,
      nodeBorder: activeTheme.primary,
      nodeDot: activeTheme.primary,
      textureSource: activeTheme.appTextureSource,
    }),
    [
      activeTheme.primary,
      activeTheme.surface,
      activeTheme.text,
      activeTheme.appTextureSource,
    ],
  )

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
            <ArrowLeft size={24} color={activeTheme.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenLevels}
            style={[
              styles.gameIconButton,
              { backgroundColor: activeTheme.surfaceAlt },
            ]}
          >
            <LayoutGrid size={24} color={activeTheme.mutedText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRestart}
            style={[
              styles.gameIconButton,
              { backgroundColor: activeTheme.surfaceAlt },
            ]}
          >
            <RotateCcw size={24} color={activeTheme.mutedText} />
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
            const strokeColor = reverseObjective
              ? isIntersecting
                ? activeTheme.primary
                : "#ef4444"
              : isIntersecting
                ? "#ef4444"
                : activeTheme.primary

            return (
              <Line
                key={link.id}
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke={strokeColor}
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
              nodeStyle={activeNodeStyle}
              onDrag={onNodeDrag}
              onDragEnd={onNodeDragEnd}
              onDragStart={onNodeDragStart}
              onDragFinalize={onNodeDragFinalize}
              disabled={isNodeDragLocked}
            />
          </View>
        ))}

        {isLevelComplete && (
          <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
            {nodes.map((node) => (
              <ConfettiBurst
                key={`confetti-${node.id}`}
                node={node}
                seed={String(level)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.gameFooter}>
        {typeof trialTimeLeftSeconds === "number" && (
          <Text style={styles.trialTimerText}>
            Time Left: {trialTimeLeftSeconds}s
          </Text>
        )}
        <Text style={[styles.hintText, { color: activeTheme.mutedText }]}>
          {reverseObjective
            ? "Drag nodes to cross every line. Red links still need a crossing."
            : "Drag nodes to untangle. Green links are clear!"}
        </Text>
      </View>
    </View>
  )
}
