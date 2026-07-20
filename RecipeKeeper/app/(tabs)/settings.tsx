import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { deleteApiKey, loadApiKey, saveApiKey } from '../../src/claude';
import { loadDefaultSeasonings, saveDefaultSeasonings } from '../../src/storage';

const BASIC_SEASONINGS = [
  '醤油', 'みりん', '料理酒', '砂糖', '塩', 'こしょう',
  '味噌', '酢', 'サラダ油', 'ごま油', 'オリーブオイル',
  'めんつゆ', '鶏ガラスープの素', 'コンソメ', 'マヨネーズ', 'ケチャップ',
];

export default function SettingsScreen() {
  const [seasonings, setSeasonings] = useState<string[]>([]);
  const [newSeasoning, setNewSeasoning] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  useEffect(() => {
    loadDefaultSeasonings().then(setSeasonings);
    loadApiKey().then((key) => setApiKeySaved(!!key));
  }, []);

  function persist(next: string[]) {
    setSeasonings(next);
    saveDefaultSeasonings(next);
  }

  function addSeasoning() {
    const trimmed = newSeasoning.trim();
    if (!trimmed || seasonings.includes(trimmed)) {
      setNewSeasoning('');
      return;
    }
    persist([...seasonings, trimmed]);
    setNewSeasoning('');
  }

  function removeSeasoning(item: string) {
    persist(seasonings.filter((s) => s !== item));
  }

  async function handleSaveApiKey() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    await saveApiKey(trimmed);
    setApiKeyInput('');
    setApiKeySaved(true);
  }

  async function handleDeleteApiKey() {
    await deleteApiKey();
    setApiKeySaved(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Section title="常備調味料" footer="ここに登録した調味料は、AIレシピ生成時に「家にあるもの」として扱われます。">
        {seasonings.map((item) => (
          <View key={item} style={styles.seasoningRow}>
            <Text style={styles.seasoningText}>{item}</Text>
            <Pressable onPress={() => removeSeasoning(item)} hitSlop={8}>
              <Text style={styles.removeText}>削除</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="例: 醤油、味噌、ごま油…"
            value={newSeasoning}
            onChangeText={setNewSeasoning}
            onSubmitEditing={addSeasoning}
          />
          <Pressable
            style={[styles.addButton, !newSeasoning.trim() && styles.addButtonDisabled]}
            onPress={addSeasoning}
            disabled={!newSeasoning.trim()}
          >
            <Text style={styles.addButtonText}>追加</Text>
          </Pressable>
        </View>
      </Section>

      {seasonings.length === 0 && (
        <Section title="">
          <Pressable style={styles.bulkButton} onPress={() => persist(BASIC_SEASONINGS)}>
            <Text style={styles.bulkButtonText}>基本の調味料をまとめて登録</Text>
          </Pressable>
        </Section>
      )}

      <Section title="Anthropic APIキー" footer="AIレシピ生成に必要です。console.anthropic.com で発行し、ここに貼り付けてください。キーは端末のSecure Storeに保存され、外部には送信されません(Anthropic APIへのリクエスト時のみ使用)。利用量に応じてAPI料金が発生します。">
        {apiKeySaved ? (
          <View>
            <Text style={styles.apiSavedText}>✅ APIキー設定済み</Text>
            <Pressable onPress={handleDeleteApiKey}>
              <Text style={styles.deleteApiKeyText}>APIキーを削除</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="sk-ant-… を貼り付け"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Pressable
              style={[styles.addButton, !apiKeyInput.trim() && styles.addButtonDisabled]}
              onPress={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
            >
              <Text style={styles.addButtonText}>保存</Text>
            </Pressable>
          </View>
        )}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  footer,
  children,
}: {
  title: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title.length > 0 && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
      {footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, color: '#666', fontWeight: '600' },
  footer: { fontSize: 12, color: '#999', lineHeight: 17 },
  seasoningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  seasoningText: { fontSize: 15 },
  removeText: { color: '#ff3b30', fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonDisabled: { opacity: 0.4 },
  addButtonText: { color: 'white', fontWeight: '600' },
  bulkButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bulkButtonText: { color: '#007AFF', fontWeight: '600' },
  apiSavedText: { color: '#34c759', fontSize: 15, marginBottom: 8 },
  deleteApiKeyText: { color: '#ff3b30', fontSize: 14 },
});
