# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Google Mobile Ads (react-native-google-mobile-ads)
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep interface com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.**

# RevenueCat (react-native-purchases)
-keep class com.revenuecat.** { *; }
-keep interface com.revenuecat.** { *; }
-keep class com.revenuecat.purchases.** { *; }
-keep interface com.revenuecat.purchases.** { *; }
-dontwarn com.revenuecat.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Add any project specific keep options here:
