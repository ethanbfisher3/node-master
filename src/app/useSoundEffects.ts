import { useCallback, useEffect, useRef } from "react"
import { Audio } from "expo-av"

type CallbackWrapper = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
) => (...args: TArgs) => void

type SoundEffects = {
  playMenuClickSound: () => void
  withMenuClickSound: CallbackWrapper
  withThemeChangeSound: CallbackWrapper
  playVictorySound: () => void
}

export function useSoundEffects(soundEnabled: boolean): SoundEffects {
  const menuClickSoundRef = useRef<Audio.Sound | null>(null)
  const isMenuClickSoundLoadingRef = useRef(false)
  const themeChangeSoundRef = useRef<Audio.Sound | null>(null)
  const isThemeChangeSoundLoadingRef = useRef(false)
  const victorySoundRef = useRef<Audio.Sound | null>(null)
  const isVictorySoundLoadingRef = useRef(false)

  useEffect(() => {
    if (!soundEnabled) {
      void menuClickSoundRef.current?.unloadAsync()
      menuClickSoundRef.current = null
      return
    }

    let cancelled = false
    isMenuClickSoundLoadingRef.current = true

    const preloadMenuClickSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        })

        const { sound } = await Audio.Sound.createAsync(
          require("../sounds/button_click.mp3"),
          {
            shouldPlay: false,
            volume: 0.55,
          },
        )

        if (cancelled) {
          await sound.unloadAsync()
          return
        }

        await menuClickSoundRef.current?.unloadAsync()
        menuClickSoundRef.current = sound
      } catch {
        if (!cancelled) {
          menuClickSoundRef.current = null
        }
      } finally {
        isMenuClickSoundLoadingRef.current = false
      }
    }

    void preloadMenuClickSound()

    return () => {
      cancelled = true
      isMenuClickSoundLoadingRef.current = false
      void menuClickSoundRef.current?.unloadAsync()
      menuClickSoundRef.current = null
    }
  }, [soundEnabled])

  const playMenuClickSound = useCallback(() => {
    if (!soundEnabled || isMenuClickSoundLoadingRef.current) {
      return
    }

    const currentSound = menuClickSoundRef.current
    if (!currentSound) {
      return
    }

    void currentSound.replayAsync().catch(() => {
      // Ignore playback errors to keep navigation responsive.
    })
  }, [soundEnabled])

  const withMenuClickSound: CallbackWrapper = useCallback(
    (callback) =>
      (...args) => {
        playMenuClickSound()
        callback(...args)
      },
    [playMenuClickSound],
  )

  useEffect(() => {
    if (!soundEnabled) {
      void themeChangeSoundRef.current?.unloadAsync()
      themeChangeSoundRef.current = null
      return
    }

    let cancelled = false
    isThemeChangeSoundLoadingRef.current = true

    const preloadThemeChangeSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../sounds/theme_change.mp3"),
          {
            shouldPlay: false,
            volume: 0.6,
          },
        )

        if (cancelled) {
          await sound.unloadAsync()
          return
        }

        await themeChangeSoundRef.current?.unloadAsync()
        themeChangeSoundRef.current = sound
      } catch {
        if (!cancelled) {
          themeChangeSoundRef.current = null
        }
      } finally {
        isThemeChangeSoundLoadingRef.current = false
      }
    }

    void preloadThemeChangeSound()

    return () => {
      cancelled = true
      isThemeChangeSoundLoadingRef.current = false
      void themeChangeSoundRef.current?.unloadAsync()
      themeChangeSoundRef.current = null
    }
  }, [soundEnabled])

  const playThemeChangeSound = useCallback(() => {
    if (!soundEnabled || isThemeChangeSoundLoadingRef.current) {
      return
    }

    const currentSound = themeChangeSoundRef.current
    if (!currentSound) {
      return
    }

    void currentSound.replayAsync().catch(() => {
      // Ignore playback errors to keep UI interaction responsive.
    })
  }, [soundEnabled])

  const withThemeChangeSound: CallbackWrapper = useCallback(
    (callback) =>
      (...args) => {
        playThemeChangeSound()
        callback(...args)
      },
    [playThemeChangeSound],
  )

  useEffect(() => {
    if (!soundEnabled) {
      void victorySoundRef.current?.unloadAsync()
      victorySoundRef.current = null
      return
    }

    let cancelled = false
    isVictorySoundLoadingRef.current = true

    const preloadVictorySound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        })

        const { sound } = await Audio.Sound.createAsync(
          require("../sounds/victory.mp3"),
          {
            shouldPlay: false,
            volume: 0.7,
          },
        )

        if (cancelled) {
          await sound.unloadAsync()
          return
        }

        await victorySoundRef.current?.unloadAsync()
        victorySoundRef.current = sound
      } catch {
        if (!cancelled) {
          victorySoundRef.current = null
        }
      } finally {
        isVictorySoundLoadingRef.current = false
      }
    }

    void preloadVictorySound()

    return () => {
      cancelled = true
      isVictorySoundLoadingRef.current = false
      void victorySoundRef.current?.unloadAsync()
      victorySoundRef.current = null
    }
  }, [soundEnabled])

  const playVictorySound = useCallback(() => {
    if (!soundEnabled || isVictorySoundLoadingRef.current) {
      return
    }

    const currentSound = victorySoundRef.current
    if (!currentSound) {
      console.warn("Victory sound not loaded")
      return
    }

    void currentSound
      .stopAsync()
      .then(() => {
        void currentSound.playAsync().catch(() => {})
      })
      .catch(() => {})
  }, [soundEnabled])

  return {
    playMenuClickSound,
    withMenuClickSound,
    withThemeChangeSound,
    playVictorySound,
  }
}
