import React, { useMemo } from "react"
import { Image, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import type { SharedValue } from "react-native-reanimated"

import { Node } from "../utils/gameLogic"

export type NodeVisualStyle = {
  nodeFill: string
  nodeBorder: string
  nodeDot?: string
  textureSource?: number
}
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  NODE_RADIUS,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  styles,
} from "../styles"

type DraggableNodeProps = {
  node: Node
  nodeStyle: NodeVisualStyle
  positionX: SharedValue<number>
  positionY: SharedValue<number>
  onDrag: (id: string, x: number, y: number) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onDragStart?: (id: string) => void
  onDragFinalize?: (id: string) => void
  disabled?: boolean
}

export function DraggableNode({
  node,
  nodeStyle,
  positionX,
  positionY,
  onDrag,
  onDragEnd,
  onDragStart,
  onDragFinalize,
  disabled = false,
}: DraggableNodeProps): React.JSX.Element {
  const activeNodeStyle = nodeStyle
  const scale = useSharedValue(1)

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .onBegin(() => {
          scale.value = withTiming(1.2, { duration: 120, easing: Easing.out(Easing.quad) })
          if (onDragStart) {
            runOnJS(onDragStart)(node.id)
          }
        })
        .onUpdate((event) => {
          const boardX = (SCREEN_WIDTH - GAME_WIDTH) / 2
          const boardY = (SCREEN_HEIGHT - GAME_HEIGHT) / 2

          const nextX = Math.max(
            NODE_RADIUS,
            Math.min(GAME_WIDTH - NODE_RADIUS, event.absoluteX - boardX),
          )
          const nextY = Math.max(
            NODE_RADIUS,
            Math.min(GAME_HEIGHT - NODE_RADIUS, event.absoluteY - boardY),
          )

          positionX.value = nextX
          positionY.value = nextY

          runOnJS(onDrag)(node.id, nextX, nextY)
        })
        .onEnd(() => {
          scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) })
          runOnJS(onDragEnd)(node.id, positionX.value, positionY.value)
        })
        .onFinalize(() => {
          scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) })
          if (onDragFinalize) {
            runOnJS(onDragFinalize)(node.id)
          }
        }),
    [
      disabled,
      node.id,
      onDrag,
      onDragEnd,
      onDragFinalize,
      onDragStart,
      positionX,
      positionY,
      scale,
    ],
  )

  const animatedStyle = useAnimatedStyle(() => ({
    zIndex: scale.value > 1 ? 20 : 10,
    transform: [
      { translateX: positionX.value - NODE_RADIUS },
      { translateY: positionY.value - NODE_RADIUS },
      { scale: scale.value },
    ],
  }))

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.nodeContainer, animatedStyle]}>
        <View
          style={[
            styles.nodeInner,
            {
              backgroundColor: activeNodeStyle.nodeFill,
              borderColor: activeNodeStyle.nodeBorder,
              borderWidth: 2,
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
                activeNodeStyle.nodeDot && {
                  backgroundColor: activeNodeStyle.nodeDot,
                },
              ]}
            />
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  )
}
