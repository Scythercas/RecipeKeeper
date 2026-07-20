import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useRecipes } from '../../src/RecipesContext';
import { generateRecipe, type GeneratedRecipe } from '../../src/claude';
import { loadDefaultSeasonings } from '../../src/storage';

export default function AIGenerateScreen() {
  const { addRecipe } = useRecipes();

  const [ingredientsText, setIngredientsText] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [useDefaultSeasonings, setUseDefaultSeasonings] = useState(true);
  const [defaultSeasonings, setDefaultSeasonings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedRecipe | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDefaultSeasonings().then(setDefaultSeasonings);
  }, []);

  const canGenerate = !isLoading && ingredientsText.trim().length > 0;

  async function generate() {
    setErrorMessage(null);
    setGenerated(null);
    setIsLoading(true);
    try {
      const ingredients = ingredientsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const result = await generateRecipe({
        availableIngredients: ingredients,
        defaultSeasonings: useDefaultSeasonings ? defaultSeasonings : [],
        requestNote,
      });
      setGenerated(result);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveGenerated() {
    if (!generated) return;
    try {
      await addRecipe({
        title: generated.title,
        genre: generated.genre,
        sourceURL: '',
        ingredients: generated.ingredients,
        seasonings: generated.seasonings,
        steps: generated.steps,
        memo: generated.point ? `ポイント: ${generated.point}` : '',
        isAIGenerated: true,
        dishPhotos: [],
        handwrittenPhotos: [],
      });
      Alert.alert('レシピに保存しました');
      setGenerated(null);
      setIngredientsText('');
      setRequestNote('');
    } catch (e) {
      Alert.alert('保存に失敗しました', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Section title="今ある食材・調味料(1行に1つ)">
        <TextInput
          style={styles.textArea}
          placeholder={'例:\n鶏むね肉\nキャベツ\nオイスターソース'}
          value={ingredientsText}
          onChangeText={setIngredientsText}
          multiline
        />
      </Section>

      <Section title="">
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>常備調味料を使う前提にする</Text>
          <Switch value={useDefaultSeasonings} onValueChange={setUseDefaultSeasonings} />
        </View>
        {useDefaultSeasonings &&
          (defaultSeasonings.length === 0 ? (
            <Text style={styles.warnText}>常備調味料が未設定です。設定タブで登録できます。</Text>
          ) : (
            <Text style={styles.mutedText}>{defaultSeasonings.join('、')}</Text>
          ))}
      </Section>

      <Section title="リクエスト(任意)">
        <TextInput
          style={styles.input}
          placeholder="例: さっぱりした味 / 15分以内 / 子ども向け"
          value={requestNote}
          onChangeText={setRequestNote}
        />
      </Section>

      <Pressable
        style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
        onPress={generate}
        disabled={!canGenerate}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.generateButtonText}>✨ レシピを生成</Text>
        )}
      </Pressable>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      {generated && (
        <View style={styles.resultCard}>
          <View style={styles.resultTitleRow}>
            <Text style={styles.resultTitle}>✨ {generated.title}</Text>
          </View>
          <Text style={styles.genreBadge}>{generated.genre}</Text>

          <Text style={styles.sectionTitle}>食材</Text>
          {generated.ingredients.map((item, i) => (
            <Text key={i} style={styles.bodyText}>
              {item}
            </Text>
          ))}

          <Text style={styles.sectionTitle}>調味料</Text>
          {generated.seasonings.map((item, i) => (
            <Text key={i} style={styles.bodyText}>
              {item}
            </Text>
          ))}

          <Text style={styles.sectionTitle}>手順</Text>
          {generated.steps.map((step, i) => (
            <Text key={i} style={styles.bodyText}>
              {i + 1}. {step}
            </Text>
          ))}

          {generated.point.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>ポイント</Text>
              <Text style={styles.bodyText}>💡 {generated.point}</Text>
            </>
          )}

          <Pressable style={styles.saveButton} onPress={saveGenerated}>
            <Text style={styles.saveButtonText}>このレシピを保存</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {title.length > 0 && <Text style={styles.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, color: '#666', fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 15 },
  warnText: { fontSize: 12, color: '#e07a20' },
  mutedText: { fontSize: 12, color: '#888' },
  generateButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  generateButtonDisabled: { opacity: 0.4 },
  generateButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#ff3b30', fontSize: 14 },
  resultCard: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee', paddingTop: 12, gap: 4 },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center' },
  resultTitle: { fontSize: 17, fontWeight: '700' },
  genreBadge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  bodyText: { fontSize: 15, lineHeight: 22 },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
