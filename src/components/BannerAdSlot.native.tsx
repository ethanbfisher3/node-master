import React, { useEffect, useState } from "react"
import { Platform, useWindowDimensions, View } from "react-native"
import { styles } from "../styles"

const TEST_BANNER_AD_UNIT_ID = Platform.select({
  android: "ca-app-pub-3940256099942544/6300978111",
  ios: "ca-app-pub-3940256099942544/2934735716",
  default: null,
})
const envBannerAdUnitId =
  Platform.OS === "android"
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_AD_ID_ANDROID
    : Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_ADMOB_BANNER_AD_ID_IOS
      : null
const bannerAdUnitId = __DEV__ ? TEST_BANNER_AD_UNIT_ID : envBannerAdUnitId
const ANDROID_NAV_BUTTON_BUFFER = 48

export function BannerAdSlot() {
  const { width } = useWindowDimensions()
  const bottomBuffer = Platform.OS === "android" ? ANDROID_NAV_BUTTON_BUFFER : 0
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
  }, [])

  if (!bannerAdUnitId) {
    return null
  }

  if (!adModule) {
    return null
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
