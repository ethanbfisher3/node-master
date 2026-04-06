import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowLeft,
  Database,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react-native";

import { styles } from "../styles";
import {
  storageGetAllKeys,
  storageGetItem,
  storageRemoveItem,
  storageSetItem,
} from "../utils/appStorage";

type AdminScreenProps = {
  onBack: () => void;
  knownKeys?: string[];
};

async function getAllStorageKeys(knownKeys: string[]): Promise<string[]> {
  const discoveredKeys = await storageGetAllKeys();
  const merged = new Set<string>(knownKeys);
  for (const key of discoveredKeys) {
    merged.add(key);
  }

  return Array.from(merged).sort();
}

export function AdminScreen({ onBack, knownKeys = [] }: AdminScreenProps) {
  const [storageKeys, setStorageKeys] = useState<string[]>(knownKeys);
  const [selectedKey, setSelectedKey] = useState<string>(knownKeys[0] ?? "");
  const [editorKey, setEditorKey] = useState<string>(knownKeys[0] ?? "");
  const [editorValue, setEditorValue] = useState<string>("");
  const [statusText, setStatusText] = useState<string>("");
  const [isStorageReady, setIsStorageReady] = useState(false);

  const refreshKeys = useCallback(() => {
    const refresh = async () => {
      const keys = await getAllStorageKeys(knownKeys);
      setStorageKeys(keys);

      if (selectedKey && !keys.includes(selectedKey)) {
        setSelectedKey(keys[0] ?? "");
      }

      setStatusText(`Refreshed ${keys.length} keys`);
      setIsStorageReady(true);
    };

    void refresh();
  }, [knownKeys, selectedKey]);

  const loadKey = useCallback((key: string) => {
    const load = async () => {
      setSelectedKey(key);
      setEditorKey(key);

      const value = await storageGetItem(key);
      setEditorValue(value ?? "");
      setStatusText(
        value === null ? "Key does not exist yet" : `Loaded ${key}`,
      );
    };

    void load();
  }, []);

  const saveCurrent = useCallback(() => {
    const save = async () => {
      const key = editorKey.trim();
      if (!key) {
        setStatusText("Enter a key before saving");
        return;
      }

      await storageSetItem(key, editorValue);
      setSelectedKey(key);
      setStorageKeys(await getAllStorageKeys(knownKeys));
      setStatusText(`Saved ${key}`);
    };

    void save();
  }, [editorKey, editorValue, knownKeys]);

  const deleteCurrent = useCallback(() => {
    const remove = async () => {
      const key = editorKey.trim();
      if (!key) {
        setStatusText("Enter a key before deleting");
        return;
      }

      await storageRemoveItem(key);
      setStorageKeys(await getAllStorageKeys(knownKeys));
      setSelectedKey("");
      setEditorValue("");
      setStatusText(`Deleted ${key}`);
    };

    void remove();
  }, [editorKey, knownKeys]);

  const sortedKeys = useMemo(() => [...storageKeys].sort(), [storageKeys]);

  useEffect(() => {
    const hydrate = async () => {
      const keys = await getAllStorageKeys(knownKeys);
      setStorageKeys(keys);
      setIsStorageReady(true);

      const targetKey = selectedKey || keys[0];
      if (!targetKey) {
        setEditorKey("");
        setEditorValue("");
        setStatusText("No storage keys found");
        return;
      }

      if (targetKey !== selectedKey) {
        setSelectedKey(targetKey);
      }

      const value = await storageGetItem(targetKey);
      setEditorKey(targetKey);
      setEditorValue(value ?? "");
      setStatusText(`Loaded ${targetKey}`);
    };

    void hydrate();
  }, [knownKeys]);

  useEffect(() => {
    if (!isStorageReady || !selectedKey) {
      return;
    }

    void (async () => {
      const value = await storageGetItem(selectedKey);
      setEditorKey(selectedKey);
      setEditorValue(value ?? "");
      setStatusText(`Loaded ${selectedKey}`);
    })();
  }, [isStorageReady, selectedKey]);

  return (
    <View style={styles.levelsContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ADMIN</Text>
      </View>

      <View style={styles.adminContainer}>
        <View style={styles.adminHeaderRow}>
          <View style={styles.modeCardHeader}>
            <Database size={18} color="#2563eb" />
            <Text style={styles.modeCardTitle}>DATA STORES</Text>
          </View>
          <TouchableOpacity style={styles.modeCardButton} onPress={refreshKeys}>
            <RefreshCw size={16} color="white" />
            <Text style={styles.modeCardButtonText}>REFRESH</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.adminKeyRow}
          contentContainerStyle={styles.adminKeyRowContent}
        >
          {sortedKeys.map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.adminKeyChip,
                key === selectedKey && styles.adminKeyChipActive,
              ]}
              onPress={() => loadKey(key)}
            >
              <Text
                style={[
                  styles.adminKeyChipText,
                  key === selectedKey && styles.adminKeyChipTextActive,
                ]}
              >
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.adminLabel}>Key</Text>
        <TextInput
          style={styles.adminInput}
          value={editorKey}
          onChangeText={setEditorKey}
          placeholder="storage.key"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.adminLabel}>Value</Text>
        <TextInput
          style={styles.adminTextArea}
          value={editorValue}
          onChangeText={setEditorValue}
          multiline
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Raw string or JSON"
        />

        <View style={styles.adminButtonsRow}>
          <TouchableOpacity style={styles.modeCardButton} onPress={saveCurrent}>
            <Save size={16} color="white" />
            <Text style={styles.modeCardButtonText}>SAVE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeCardButton, styles.adminDeleteButton]}
            onPress={deleteCurrent}
          >
            <Trash2 size={16} color="white" />
            <Text style={styles.modeCardButtonText}>DELETE</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.adminStatusText}>{statusText || "Ready"}</Text>
      </View>
    </View>
  );
}
