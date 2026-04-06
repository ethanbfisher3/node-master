import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ArrowLeft, BadgeCheck, ShoppingBag } from "lucide-react-native";

import { styles } from "../styles";

type StoreScreenProps = {
  coins: number;
  noAdsOwned: boolean;
  noAdsPrice: number;
  onBack: () => void;
  onBuyNoAds: () => void;
};

export function StoreScreen({
  coins,
  noAdsOwned,
  noAdsPrice,
  onBack,
  onBuyNoAds,
}: StoreScreenProps) {
  return (
    <View style={styles.levelsContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STORE</Text>
      </View>

      <View style={styles.modeCardList}>
        <View style={styles.modeCard}>
          <View style={styles.modeCardHeader}>
            <ShoppingBag size={20} color="#2563eb" />
            <Text style={styles.modeCardTitle}>NO ADS</Text>
          </View>
          <Text style={styles.modeCardBody}>
            Permanently disable ads for this profile.
          </Text>
          <Text style={styles.storePriceText}>
            PRICE: ${noAdsPrice.toFixed(2)}
          </Text>

          <TouchableOpacity
            style={[
              styles.modeCardButton,
              (noAdsOwned || coins < noAdsPrice) &&
                styles.modeCardButtonDisabled,
            ]}
            onPress={onBuyNoAds}
            disabled={noAdsOwned || coins < noAdsPrice}
          >
            {noAdsOwned ? (
              <BadgeCheck size={18} color="white" />
            ) : (
              <ShoppingBag size={18} color="white" />
            )}
            <Text style={styles.modeCardButtonText}>
              {noAdsOwned
                ? "PURCHASED"
                : coins < noAdsPrice
                  ? "NOT ENOUGH COINS"
                  : "BUY NO ADS"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
