import React from "react"
import { Animated, View } from "react-native"
import { styles } from "../styles"
import type { ViewType } from "./types"
import type { ViewStackTransition } from "./useViewStack"

type ScreenStackProps = {
  view: ViewType
  transition: ViewStackTransition | null
  transitionProgress: Animated.Value
  screenWidth: number
  renderView: (viewType: ViewType) => React.ReactNode
}

export function ScreenStack({
  view,
  transition,
  transitionProgress,
  screenWidth,
  renderView,
}: ScreenStackProps) {
  if (!transition) {
    return (
      <View style={styles.screenStack}>
        <View style={styles.screenLayerStatic}>{renderView(view)}</View>
      </View>
    )
  }

  const isPush = transition.direction === "push"
  const slideOffset = screenWidth * 0.08
  const fromTranslateX = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: isPush ? [0, -slideOffset] : [0, screenWidth],
  })
  const toTranslateX = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: isPush ? [screenWidth, 0] : [-slideOffset, 0],
  })
  const fromOpacity = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  })
  const toOpacity = transitionProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  })

  const fromLayer = (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.screenLayer,
        { transform: [{ translateX: fromTranslateX }], opacity: fromOpacity },
      ]}
    >
      {renderView(transition.from)}
    </Animated.View>
  )

  const toLayer = (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.screenLayer,
        { transform: [{ translateX: toTranslateX }], opacity: toOpacity },
      ]}
    >
      {renderView(transition.to)}
    </Animated.View>
  )

  return (
    <View style={styles.screenStack}>
      {isPush ? (
        <>
          {fromLayer}
          {toLayer}
        </>
      ) : (
        <>
          {toLayer}
          {fromLayer}
        </>
      )}
    </View>
  )
}
