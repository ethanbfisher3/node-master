export default {
  expo: {
    name: "Uncrossed",
    slug: "nodemaster",
    version: "1.1.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    plugins: [
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-9592701510571371~6592931335",
          iosAppId: "ca-app-pub-9592701510571371~6746871786",
          ios_app_id: "ca-app-pub-9592701510571371~6746871786"
        },
      ],
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ethanbfisher3.nodemaster"
    },
    icon: "./src/images/nodemaster_icon_512.jpg",
    splash: {
      image: "./src/images/splash_screen.jpg",
      resizeMode: "cover",
      backgroundColor: "#ffffff",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        backgroundImage: "./src/images/nodemaster_icon_512.jpg",
        foregroundImage: "./src/images/nodemaster_icon_512.jpg",
      },
      package: "com.ethanbfisher3.nodemaster",
    },
    web: {},
    extra: {
      revenueCatApiKeyApple: process.env.REVENUECAT_API_KEY_APPLE,
      revenueCatApiKeyGoogle: process.env.REVENUECAT_API_KEY_GOOGLE,
      revenueCatApiKeyTestStore: process.env.REVENUECAT_API_KEY_TEST_STORE,
      eas: {
        projectId: "3f47d194-2092-47a0-9422-090e3a3839e9",
      },
    },
  },
}
