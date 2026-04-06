import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { Node } from "../utils/gameLogic";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  NODE_RADIUS,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  styles,
} from "../styles";

type DraggableNodeProps = {
  node: Node;
  allNodes: Node[];
  onDrag: (id: string, x: number, y: number) => void;
};

export function DraggableNode({ node, allNodes, onDrag }: DraggableNodeProps) {
  const translateX = useSharedValue(node.x);
  const translateY = useSharedValue(node.y);

  useEffect(() => {
    translateX.value = node.x;
    translateY.value = node.y;
  }, [node.x, node.y, translateX, translateY]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan().onUpdate((event) => {
        const boardX = (SCREEN_WIDTH - GAME_WIDTH) / 2;
        const boardY = (SCREEN_HEIGHT - GAME_HEIGHT) / 2;
        const minimumDistance = NODE_RADIUS * 2;
        const otherNodes = allNodes.filter(
          (currentNode) => currentNode.id !== node.id,
        );

        let nextX = Math.max(
          NODE_RADIUS,
          Math.min(GAME_WIDTH - NODE_RADIUS, event.absoluteX - boardX),
        );
        let nextY = Math.max(
          NODE_RADIUS,
          Math.min(GAME_HEIGHT - NODE_RADIUS, event.absoluteY - boardY),
        );

        for (let pass = 0; pass < 8; pass++) {
          let changed = false;

          for (const otherNode of otherNodes) {
            const dx = nextX - otherNode.x;
            const dy = nextY - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance >= minimumDistance) {
              continue;
            }

            const safeDistance = distance === 0 ? 1 : distance;
            const overlap = minimumDistance - safeDistance;
            const directionX = distance === 0 ? 1 : dx / safeDistance;
            const directionY = distance === 0 ? 0 : dy / safeDistance;

            nextX += directionX * overlap;
            nextY += directionY * overlap;
            nextX = Math.max(
              NODE_RADIUS,
              Math.min(GAME_WIDTH - NODE_RADIUS, nextX),
            );
            nextY = Math.max(
              NODE_RADIUS,
              Math.min(GAME_HEIGHT - NODE_RADIUS, nextY),
            );
            changed = true;
          }

          if (!changed) {
            break;
          }
        }

        translateX.value = nextX;
        translateY.value = nextY;

        runOnJS(onDrag)(node.id, nextX, nextY);
      }),
    [allNodes, node.id, onDrag, translateX, translateY],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - NODE_RADIUS },
      { translateY: translateY.value - NODE_RADIUS },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.nodeContainer, animatedStyle]}>
        <View style={styles.nodeInner}>
          <View style={styles.nodeDot} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
