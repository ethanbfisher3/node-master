import React, { useEffect, useState } from "react"
import { Platform, useWindowDimensions, View } from "react-native"
import { styles } from "../styles"
import { TestIds } from "react-native-google-mobile-ads"
import { useIsOffline } from "../utils/useIsOffline"
import { DateCraftAdBanner } from "./DateCraftAdBanner"

const bannerAdUnitId = __DEV__
  ? TestIds.BANNER
  : Platform.OS === "android"
    ? "ca-app-pub-9592701510571371/3743406719"
    : Platform.OS === "ios"
      ? "ca-app-pub-9592701510571371/7209906218"
      : null
const ANDROID_NAV_BUTTON_BUFFER = 48

export function BannerAdSlot() {
  const { width } = useWindowDimensions()
  const bottomBuffer = Platform.OS === "android" ? ANDROID_NAV_BUTTON_BUFFER : 0
  const isOffline = useIsOffline()
  const [adModule, setAdModule] = useState<
    typeof import("react-native-google-mobile-ads") | null
  >(null)

  useEffect(() => {
    if (!bannerAdUnitId) {
      return
    }

    let cancelled = false

    const loadAdModule = async () => {
      try {
        const module = await import("react-native-google-mobile-ads")
        if (!cancelled) {
          setAdModule(module)
        }
      } catch {
        if (!cancelled) {
          setAdModule(null)
        }
      }
    }

    void loadAdModule()

    return () => {
      cancelled = true
    }
  }, [isOffline])

  if (isOffline || !bannerAdUnitId || !adModule) {
    return (
      <View style={[styles.bannerAdContainer, { paddingBottom: bottomBuffer }]}>
        <DateCraftAdBanner />
      </View>
    )
  }

  const { BannerAd } = adModule

  return (
    <View style={[styles.bannerAdContainer, { paddingBottom: bottomBuffer }]}>
      <BannerAd
        unitId={bannerAdUnitId}
        size="ANCHORED_ADAPTIVE_BANNER"
        width={width}
      />
    </View>
  )
}
