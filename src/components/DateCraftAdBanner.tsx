import React from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
} from "react-native"
import { styles } from "../styles"

export function DateCraftAdBanner() {
  const handlePress = () => {
    if (Platform.OS === "android") {
      void Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.ethanbfisher3.dateplanner",
      )
    } else if (Platform.OS === "ios") {
      // iOS App Store link (if available)
      void Linking.openURL(
        "https://apps.apple.com/app/datecraft-date-planner/id1234567890",
      )
    } else {
      // Web
      void Linking.openURL(
        "https://play.google.com/store/apps/details?id=com.ethanbfisher3.dateplanner",
      )
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={styles.dateCraftAdBanner}
    >
      <Image
        source={require("../images/date_planner_icon.jpg")}
        style={styles.dateCraftAdIcon}
      />
      <View style={styles.dateCraftAdContent}>
        <Text style={styles.dateCraftAdTitle}>DateCraft: Date Planner</Text>
        <Text style={styles.dateCraftAdSubtitle}>
          Plan your special moments!
        </Text>
      </View>
      <Text style={styles.dateCraftAdCTA}>Learn More</Text>
    </TouchableOpacity>
  )
}
