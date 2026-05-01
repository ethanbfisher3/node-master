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

export function DateCraftPopupAd({ onClose }: { onClose: () => void }) {
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
    onClose()
  }

  return (
    <View style={styles.popupAdOverlay}>
      <View style={styles.popupAdCard}>
        <Text style={styles.popupAdTag}>Recommended App</Text>
        <Image
          source={require("../images/date_planner_icon.jpg")}
          style={styles.dateCraftPopupIcon}
        />
        <Text style={styles.popupAdTitle}>DateCraft: Date Planner</Text>
        <Text style={styles.popupAdBody}>
          Plan your special moments and never miss an important date!
        </Text>
        <View style={styles.popupAdVideoFrame}>
          <View
            style={[styles.popupAdPlayButton, { backgroundColor: "#ec4899" }]}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          style={{
            width: "100%",
            backgroundColor: "#ec4899",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
            Get DateCraft
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onClose}
          style={{
            width: "100%",
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#94a3b8" }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
