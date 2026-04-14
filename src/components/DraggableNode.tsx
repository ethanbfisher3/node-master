import React, { useEffect, useMemo, useState } from "react";
import { Image, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Node } from "../utils/gameLogic";

export type NodeVisualStyle = {
  nodeFill: string;
  nodeBorder: string;
  nodeDot: string;
  textureSource?: number;
};
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
  nodeStyle: NodeVisualStyle;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
};

export function DraggableNode({
  node,
  nodeStyle,
  onDrag,
  onDragEnd,
}: DraggableNodeProps): React.JSX.Element {
  const activeNodeStyle = nodeStyle;
  const translateX = useSharedValue(node.x);
  const translateY = useSharedValue(node.y);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isDragging) {
      translateX.value = node.x;
      translateY.value = node.y;
      return;
    }

    translateX.value = withTiming(node.x, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withTiming(node.y, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  }, [isDragging, node.x, node.y, translateX, translateY]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          runOnJS(setIsDragging)(true);
        })
        .onUpdate((event) => {
          const boardX = (SCREEN_WIDTH - GAME_WIDTH) / 2;
          const boardY = (SCREEN_HEIGHT - GAME_HEIGHT) / 2;

          let nextX = Math.max(
            NODE_RADIUS,
            Math.min(GAME_WIDTH - NODE_RADIUS, event.absoluteX - boardX),
          );
          let nextY = Math.max(
            NODE_RADIUS,
            Math.min(GAME_HEIGHT - NODE_RADIUS, event.absoluteY - boardY),
          );

          translateX.value = nextX;
          translateY.value = nextY;

          runOnJS(onDrag)(node.id, nextX, nextY);
        })
        .onEnd(() => {
          runOnJS(setIsDragging)(false);
          runOnJS(onDragEnd)(node.id, translateX.value, translateY.value);
        })
        .onFinalize(() => {
          runOnJS(setIsDragging)(false);
        }),
    [node.id, onDrag, onDragEnd, translateX, translateY],
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
        <View
          style={[
            styles.nodeInner,
            {
              backgroundColor: activeNodeStyle.nodeFill,
              borderColor: activeNodeStyle.nodeBorder,
              borderWidth: activeNodeStyle.textureSource ? 0 : undefined,
              overflow: "hidden",
            },
          ]}
        >
          {activeNodeStyle.textureSource && (
            <Image
              source={activeNodeStyle.textureSource}
              style={{
                position: "absolute",
                width: "110%",
                height: "110%",
                top: "-5%",
                left: "-10%",
                transform: [{ scale: 1.8 }],
              }}
              resizeMode="cover"
            />
          )}
          {!activeNodeStyle.textureSource && (
            <View
              style={[
                styles.nodeDot,
                {
                  backgroundColor: activeNodeStyle.nodeDot,
                },
              ]}
            />
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
