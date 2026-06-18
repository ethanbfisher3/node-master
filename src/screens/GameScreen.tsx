import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { ArrowLeft, LayoutGrid, RotateCcw, Undo2 } from "lucide-react-native";
import Animated, {
  cancelAnimation,
  Easing,
  makeMutable,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import { AppThemePalette, DEFAULT_APP_THEME } from "../data/cosmetics";
import {
  DraggableNode,
  type NodeVisualStyle,
} from "../components/DraggableNode";
import { styles } from "../styles";
import { Link, Node } from "../utils/gameLogic";

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type AnimatedLinkProps = {
  posX1: SharedValue<number>;
  posY1: SharedValue<number>;
  posX2: SharedValue<number>;
  posY2: SharedValue<number>;
  stroke: string;
  strokeWidth: number;
};

const AnimatedLink = React.memo(function AnimatedLink({
  posX1,
  posY1,
  posX2,
  posY2,
  stroke,
  strokeWidth,
}: AnimatedLinkProps) {
  const animatedProps = useAnimatedProps(() => ({
    x1: posX1.value,
    y1: posY1.value,
    x2: posX2.value,
    y2: posY2.value,
  }));

  return (
    <AnimatedLine
      animatedProps={animatedProps}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  );
});

type LinkRippleProps = { x: number; y: number; color: string };

function LinkRipple({ x, y, color }: LinkRippleProps) {
  const radius = useSharedValue(0);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    radius.value = withTiming(48, { duration: 480, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 480, easing: Easing.out(Easing.quad) });
  }, [opacity, radius]);

  const animatedProps = useAnimatedProps(() => ({
    r: radius.value,
    opacity: opacity.value,
  }));

  return (
    <AnimatedCircle
      cx={x}
      cy={y}
      animatedProps={animatedProps}
      fill="none"
      stroke={color}
      strokeWidth={2.5}
    />
  );
}

const CONFETTI_COLORS = [
  "#4ade80",
  "#facc15",
  "#38bdf8",
  "#fb923c",
  "#f87171",
  "#c084fc",
  "#2dd4bf",
  "#fef08a",
];

const CONFETTI_DURATION = 1200;

const CONFETTI_SHAPES = [
  { size: 16, borderRadius: 999 },
  { size: 18, borderRadius: 2 },
  { size: 17, borderRadius: 999 },
  { size: 15, borderRadius: 2 },
  { size: 16, borderRadius: 999 },
  { size: 18, borderRadius: 2 },
  { size: 15, borderRadius: 999 },
  { size: 14, borderRadius: 999 },
  { size: 19, borderRadius: 2 },
  { size: 16, borderRadius: 4 },
  { size: 14, borderRadius: 999 },
  { size: 17, borderRadius: 2 },
  { size: 15, borderRadius: 4 },
  { size: 18, borderRadius: 999 },
];

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function createConfettiVector(
  seed: string,
  nodeId: string,
  pieceIndex: number,
) {
  const hash = hashString(`${seed}:${nodeId}:${pieceIndex}`);
  const angle = ((hash % 360) * Math.PI) / 180;
  const distance = 30 + (hash % 26);
  const lift = 12 + ((hash >> 3) % 12);
  const sway = ((hash >> 5) % 2 === 0 ? 1 : -1) * (8 + ((hash >> 7) % 12));

  return { angle, distance, lift, sway };
}

function getConfettiColor(seed: string, nodeId: string, pieceIndex: number) {
  const hash = hashString(`${seed}:${nodeId}:${pieceIndex}:color`);
  return CONFETTI_COLORS[hash % CONFETTI_COLORS.length];
}

function SolveFlash({ color }: { color: string }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(0.28, { duration: 70 }),
      withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }),
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: color }, style]}
    />
  );
}

type SolveRingProps = { cx: number; cy: number; delay: number; color: string };

function SolveRing({ cx, cy, delay, color }: SolveRingProps) {
  const radius = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withSequence(
        withTiming(0.55, { duration: 60 }),
        withTiming(0, { duration: 540, easing: Easing.out(Easing.quad) }),
      );
      radius.value = withTiming(220, { duration: 600, easing: Easing.out(Easing.cubic) });
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, radius]);

  const animatedProps = useAnimatedProps(() => ({
    r: radius.value,
    opacity: opacity.value,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      animatedProps={animatedProps}
      fill="none"
      stroke={color}
      strokeWidth={3}
    />
  );
}

function SolveRings({ color }: { color: string }) {
  const cx = 175; // GAME_WIDTH / 2
  const cy = 250; // GAME_HEIGHT / 2
  return (
    <>
      <SolveRing cx={cx} cy={cy} delay={0} color={color} />
      <SolveRing cx={cx} cy={cy} delay={140} color={color} />
      <SolveRing cx={cx} cy={cy} delay={280} color={color} />
    </>
  );
}

type ConfettiBurstProps = {
  node: Node;
  seed: string;
};

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
  );
}

type ConfettiPieceProps = {
  node: Node;
  seed: string;
  pieceIndex: number;
  shape: { size: number; borderRadius: number };
};

function ConfettiPiece({ node, seed, pieceIndex, shape }: ConfettiPieceProps) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = 0;
    opacity.value = 1;

    progress.value = withTiming(1, {
      duration: CONFETTI_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(0, {
      duration: CONFETTI_DURATION,
      easing: Easing.out(Easing.quad),
    });
  }, [opacity, progress, seed]);

  const vector = useMemo(
    () => createConfettiVector(seed, node.id, pieceIndex),
    [node.id, pieceIndex, seed],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const travelX = Math.cos(vector.angle) * vector.distance * progress.value;
    const travelY =
      Math.sin(vector.angle) * vector.distance * progress.value -
      vector.lift * progress.value;

    return {
      opacity: opacity.value,
      transform: [
        { translateX: travelX + vector.sway * progress.value },
        { translateY: travelY },
        { scale: 1 - progress.value * 0.35 },
        { rotate: `${progress.value * 140}deg` },
      ],
    };
  });

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
  );
}

type GameScreenProps = {
  level: number;
  // coins: number
  nodes: Node[];
  links: Link[];
  intersectingLinks: Set<string>;
  crossingCount: number;
  moveCount: number;
  initialCrossingCount: number;
  canUndo: boolean;
  isLevelComplete: boolean;
  isNodeDragLocked: boolean;
  trialTimeLeftSeconds?: number;
  reverseObjective?: boolean;
  noAdsOwned: boolean;
  theme?: AppThemePalette;
  onBackHome: () => void;
  onOpenLevels: () => void;
  onRestart: () => void;
  onUndo: () => void;
  onNodeDrag: (id: string, x: number, y: number) => void;
  onNodeDragEnd: (id: string, x: number, y: number) => void;
  onNodeDragStart: (id: string) => void;
  onNodeDragFinalize: (id: string) => void;
};

export function GameScreen({
  level,
  // coins,
  nodes,
  links,
  intersectingLinks,
  crossingCount,
  moveCount,
  initialCrossingCount,
  canUndo,
  isLevelComplete,
  isNodeDragLocked,
  trialTimeLeftSeconds,
  reverseObjective = false,
  noAdsOwned,
  theme,
  onBackHome,
  onOpenLevels,
  onRestart,
  onUndo,
  onNodeDrag,
  onNodeDragEnd,
  onNodeDragStart,
  onNodeDragFinalize,
}: GameScreenProps) {
  const activeTheme = theme ?? DEFAULT_APP_THEME;

  // Per-node shared values for line positions — updated on UI thread during drag
  const draggingNodeIdRef = useRef<string | null>(null);
  const nodeSVsRef = useRef(
    new Map<string, { x: SharedValue<number>; y: SharedValue<number> }>(),
  );

  // Sync SVs synchronously during render so AnimatedLink always has correct values.
  // During drag, skip the dragging node so the gesture handler's UI-thread
  // updates are not overwritten by stale JS-thread state.
  {
    const seenIds = new Set<string>();
    for (const node of nodes) {
      seenIds.add(node.id);
      const existing = nodeSVsRef.current.get(node.id);
      if (!existing) {
        nodeSVsRef.current.set(node.id, {
          x: makeMutable(node.x),
          y: makeMutable(node.y),
        });
      } else if (node.id !== draggingNodeIdRef.current) {
        const isDragging = draggingNodeIdRef.current !== null;
        if (isDragging) {
          existing.x.value = node.x;
          existing.y.value = node.y;
        } else {
          existing.x.value = withTiming(node.x, { duration: 100, easing: Easing.out(Easing.quad) });
          existing.y.value = withTiming(node.y, { duration: 100, easing: Easing.out(Easing.quad) });
        }
      }
    }
    for (const id of Array.from(nodeSVsRef.current.keys())) {
      if (!seenIds.has(id)) nodeSVsRef.current.delete(id);
    }
  }

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
  );

  const prevIntersectingRef = useRef<Set<string>>(new Set());
  const flashTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [flashingLinkIds, setFlashingLinkIds] = useState<Set<string>>(new Set());

  type RippleEvent = { key: number; x: number; y: number };
  const [rippleEvents, setRippleEvents] = useState<RippleEvent[]>([]);
  const rippleKeyRef = useRef(0);
  const linksRef = useRef(links);
  const nodesRef = useRef(nodes);
  useEffect(() => { linksRef.current = links; }, [links]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  const boardGlow = useSharedValue(0);
  useEffect(() => {
    boardGlow.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(boardGlow);
  }, [boardGlow]);
  const boardGlowStyle = useAnimatedStyle(() => ({
    opacity: boardGlow.value * 0.055,
  }));

  useEffect(() => {
    const nowResolved = new Set<string>();
    for (const id of prevIntersectingRef.current) {
      if (!intersectingLinks.has(id)) {
        nowResolved.add(id);
      }
    }
    prevIntersectingRef.current = new Set(intersectingLinks);

    for (const id of nowResolved) {
      const existing = flashTimersRef.current.get(id);
      if (existing) clearTimeout(existing);
      setFlashingLinkIds((prev) => new Set([...prev, id]));
      const timerId = setTimeout(() => {
        flashTimersRef.current.delete(id);
        setFlashingLinkIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 350);
      flashTimersRef.current.set(id, timerId);

      const link = linksRef.current.find((l) => l.id === id);
      if (link) {
        const n1 = nodesRef.current.find((n) => n.id === link.node1Id);
        const n2 = nodesRef.current.find((n) => n.id === link.node2Id);
        if (n1 && n2) {
          const x = (n1.x + n2.x) / 2;
          const y = (n1.y + n2.y) / 2;
          const key = ++rippleKeyRef.current;
          setRippleEvents((prev) => [...prev, { key, x, y }]);
          setTimeout(() => {
            setRippleEvents((prev) => prev.filter((r) => r.key !== key));
          }, 520);
        }
      }
    }
  }, [intersectingLinks]);

  useEffect(() => {
    for (const timer of flashTimersRef.current.values()) clearTimeout(timer);
    flashTimersRef.current.clear();
    setFlashingLinkIds(new Set());
    setRippleEvents([]);
    prevIntersectingRef.current = new Set();
  }, [level]);

  const handleNodeDragStart = useCallback(
    (id: string) => {
      draggingNodeIdRef.current = id;
      onNodeDragStart(id);
    },
    [onNodeDragStart],
  );

  const handleNodeDragFinalize = useCallback(
    (id: string) => {
      draggingNodeIdRef.current = null;
      onNodeDragFinalize(id);
    },
    [onNodeDragFinalize],
  );

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
          <TouchableOpacity
            onPress={onUndo}
            disabled={!canUndo}
            style={[
              styles.gameIconButton,
              { backgroundColor: activeTheme.surfaceAlt, opacity: canUndo ? 1 : 0.35 },
            ]}
          >
            <Undo2 size={24} color={activeTheme.mutedText} />
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

        {/* <View style={styles.gameCoinBadge}>
          <Coins size={16} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.gameCoinText}>{coins}</Text>
        </View> */}
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
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: activeTheme.primary },
            boardGlowStyle,
          ]}
        />

        <Svg style={styles.boardSvg}>
          {links.map((link) => {
            const sv1 = nodeSVsRef.current.get(link.node1Id)!;
            const sv2 = nodeSVsRef.current.get(link.node2Id)!;
            const isIntersecting = intersectingLinks.has(link.id);
            const isFlashing = flashingLinkIds.has(link.id);
            const strokeColor = reverseObjective
              ? isIntersecting
                ? activeTheme.primary
                : "#ef4444"
              : isIntersecting
                ? "#ef4444"
                : activeTheme.primary;

            return (
              <AnimatedLink
                key={link.id}
                posX1={sv1.x}
                posY1={sv1.y}
                posX2={sv2.x}
                posY2={sv2.y}
                stroke={isFlashing ? activeTheme.primary : strokeColor}
                strokeWidth={isFlashing ? 8 : isIntersecting ? 6 : 4}
              />
            );
          })}
          {rippleEvents.map((r) => (
            <LinkRipple key={r.key} x={r.x} y={r.y} color={activeTheme.primary} />
          ))}
          {isLevelComplete && <SolveRings color={activeTheme.primary} />}
        </Svg>

        {nodes.map((node) => {
          const sv = nodeSVsRef.current.get(node.id)!;
          return (
            <DraggableNode
              key={node.id}
              node={node}
              nodeStyle={activeNodeStyle}
              positionX={sv.x}
              positionY={sv.y}
              onDrag={onNodeDrag}
              onDragEnd={onNodeDragEnd}
              onDragStart={handleNodeDragStart}
              onDragFinalize={handleNodeDragFinalize}
              disabled={isNodeDragLocked}
            />
          );
        })}

        {isLevelComplete && (
          <>
            <SolveFlash color={activeTheme.primary} />
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              {nodes.map((node) => (
                <ConfettiBurst
                  key={`confetti-${node.id}`}
                  node={node}
                  seed={String(level)}
                />
              ))}
            </View>
          </>
        )}
      </View>

      <View style={styles.gameFooter}>
        {typeof trialTimeLeftSeconds === "number" && (
          <Text style={styles.trialTimerText}>
            Time Left: {trialTimeLeftSeconds}s
          </Text>
        )}
        {!reverseObjective && (
          <Text
            style={[
              styles.crossingCountText,
              { color: crossingCount === 0 ? "#22c55e" : activeTheme.primary },
            ]}
          >
            {crossingCount === 0
              ? "Untangled!"
              : `${crossingCount} crossing${crossingCount !== 1 ? "s" : ""} left`}
          </Text>
        )}

        {/* Star thresholds — only for classic (non-reverse, non-trial) levels with crossings */}
        {!reverseObjective && trialTimeLeftSeconds === undefined && initialCrossingCount > 0 && (
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 6, alignItems: "center" }}>
            {/* Current move count */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: activeTheme.mutedText,
                marginRight: 2,
              }}
            >
              {moveCount} {moveCount === 1 ? "move" : "moves"}
            </Text>

            {/* Star threshold chips */}
            {([
              { label: "★★★", max: initialCrossingCount },
              { label: "★★",  max: initialCrossingCount * 2 },
              { label: "★",   max: null },
            ] as const).map(({ label, max }) => {
              const achievable = max === null ? true : moveCount <= max;
              return (
                <View
                  key={label}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: achievable ? activeTheme.surfaceAlt : "transparent",
                    borderRadius: 8,
                    paddingHorizontal: 7,
                    paddingVertical: 4,
                    borderWidth: 1,
                    borderColor: achievable ? activeTheme.primary : activeTheme.surfaceAlt,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "900",
                      color: achievable ? "#F59E0B" : activeTheme.mutedText,
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color: achievable ? activeTheme.text : activeTheme.mutedText,
                    }}
                  >
                    {max !== null ? `≤${max}` : "any"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.hintText, { color: activeTheme.mutedText }]}>
          {reverseObjective
            ? "Drag nodes to cross every line. Red links still need a crossing."
            : "Drag nodes to untangle. Green links are clear!"}
        </Text>
      </View>
    </View>
  );
}
