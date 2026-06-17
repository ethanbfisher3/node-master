import { useCallback, useEffect, useRef, useState } from "react"
import { Animated, Easing, Platform, useWindowDimensions } from "react-native"
import type { ViewType } from "./types"

export type ViewStackTransition = {
  from: ViewType
  to: ViewType
  direction: "push" | "pop"
}

export type ViewStackMode = "auto" | "push" | "replace" | "reset" | "popTo"

export function useViewStack(initialView: ViewType = "home") {
  const [viewStack, setViewStack] = useState<ViewType[]>([initialView])
  const viewStackRef = useRef(viewStack)
  const [transition, setTransition] = useState<ViewStackTransition | null>(null)
  const transitionProgress = useRef(new Animated.Value(1)).current
  const { width: screenWidth } = useWindowDimensions()
  const view = transition?.to ?? viewStack[viewStack.length - 1]

  useEffect(() => {
    viewStackRef.current = viewStack
  }, [viewStack])

  const runTransition = useCallback(
    (nextStack: ViewType[], direction: "push" | "pop") => {
      const currentStack = viewStackRef.current
      const fromView = currentStack[currentStack.length - 1]
      const toView = nextStack[nextStack.length - 1]

      if (fromView === toView && currentStack.length === nextStack.length) {
        setViewStack(nextStack)
        setTransition(null)
        return
      }

      transitionProgress.stopAnimation()
      setTransition({ from: fromView, to: toView, direction })
      transitionProgress.setValue(0)
      Animated.timing(transitionProgress, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        setViewStack(nextStack)
        setTransition(null)
      })
    },
    [transitionProgress],
  )

  const setView = useCallback(
    (nextView: ViewType, mode: ViewStackMode = "auto") => {
      const currentStack = viewStackRef.current
      const currentView = currentStack[currentStack.length - 1]

      if (currentView === nextView) {
        return
      }

      if (mode === "reset") {
        runTransition([nextView], "pop")
        return
      }

      if (mode === "replace") {
        const nextStack =
          currentStack.length > 0
            ? [...currentStack.slice(0, -1), nextView]
            : [nextView]
        runTransition(nextStack, "push")
        return
      }

      if (mode === "push") {
        runTransition([...currentStack, nextView], "push")
        return
      }

      if (mode === "popTo") {
        const targetIndex = currentStack.lastIndexOf(nextView)
        if (targetIndex >= 0) {
          runTransition(currentStack.slice(0, targetIndex + 1), "pop")
        } else {
          runTransition([nextView], "pop")
        }
        return
      }

      if (nextView === "home") {
        runTransition(["home"], "pop")
        return
      }

      const previousView =
        currentStack.length > 1 ? currentStack[currentStack.length - 2] : null
      if (previousView === nextView) {
        runTransition(currentStack.slice(0, -1), "pop")
        return
      }

      runTransition([...currentStack, nextView], "push")
    },
    [runTransition],
  )

  return {
    view,
    setView,
    transition,
    transitionProgress,
    screenWidth,
  }
}
