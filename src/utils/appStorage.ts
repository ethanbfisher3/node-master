import AsyncStorage from "@react-native-async-storage/async-storage"

function hasWebStorage(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  return Boolean(
    (window as typeof window & { localStorage?: Storage }).localStorage,
  )
}

export async function storageGetItem(key: string): Promise<string | null> {
  if (hasWebStorage()) {
    return window.localStorage.getItem(key)
  }

  return AsyncStorage.getItem(key)
}

export async function storageSetItem(
  key: string,
  value: string,
): Promise<void> {
  if (hasWebStorage()) {
    window.localStorage.setItem(key, value)
    return
  }

  await AsyncStorage.setItem(key, value)
}

export async function storageRemoveItem(key: string): Promise<void> {
  if (hasWebStorage()) {
    window.localStorage.removeItem(key)
    return
  }

  await AsyncStorage.removeItem(key)
}

export async function storageGetAllKeys(): Promise<string[]> {
  if (hasWebStorage()) {
    const keys: string[] = []

    for (let index = 0; index < window.localStorage.length; index++) {
      const key = window.localStorage.key(index)
      if (key) {
        keys.push(key)
      }
    }

    return keys
  }

  return [...(await AsyncStorage.getAllKeys())]
}
