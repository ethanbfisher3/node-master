import { useEffect, useState } from "react"
import { Platform } from "react-native"

export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkConnectivity = async () => {
      try {
        // Try to use NetInfo if available (native only)
        if (Platform.OS !== "web") {
          try {
            const NetInfo = await import("@react-native-community/netinfo")
            const state = await NetInfo.fetch()
            if (!cancelled) {
              setIsOffline(
                state.isConnected === false ||
                  state.isInternetReachable === false,
              )
            }
            return
          } catch {
            // NetInfo not available, continue
          }
        }

        // Fallback for web or if NetInfo fails: try a simple HTTP fetch
        try {
          const response = await fetch("https://www.google.com", {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-cache",
          })
          if (!cancelled) {
            setIsOffline(false)
          }
        } catch {
          if (!cancelled) {
            setIsOffline(true)
          }
        }
      } catch {
        if (!cancelled) {
          setIsOffline(false)
        }
      }
    }

    // Check connectivity on mount
    void checkConnectivity()

    // Set up periodic checks every 5 seconds
    const interval = setInterval(() => {
      void checkConnectivity()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return isOffline
}
