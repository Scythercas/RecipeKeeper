import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { GENRES } from '../types';
import type { NewRecipeInput, Recipe } from '../types';
import PhotoAttachEditor from './PhotoAttachEditor';
import RatingPicker from './RatingPicker';

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type Props = {
  initial?: Recipe;
  onSave: (input: NewRecipeInput) => void | Promise<void>;
};

export default function RecipeForm({ initial, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [genre, setGenre] = useState(initial?.genre ?? GENRES[0]);
  const [sourceURL, setSourceURL] = useState(initial?.sourceURL ?? '');
  const [ingredientsText, setIngredientsText] = useState(
    (initial?.ingredients ?? []).join('\n')
  );
  const [seasoningsText, setSeasoningsText] = useState((initial?.seasonings ?? []).join('\n'));
  const [stepsText, setStepsText] = useState((initial?.steps ?? []).join('\n'));
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [dishPhotos, setDishPhotos] = useState<string[]>(initial?.dishPhotos ?? []);
  const [handwrittenPhotos, setHandwrittenPhotos] = useState<string[]>(
    initial?.handwrittenPhotos ?? []
  );
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);

  const canSave = title.trim().length > 0;

  function save() {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      genre,
      sourceURL: sourceURL.trim(),
      ingredients: linesToList(ingredientsText),
      seasonings: linesToList(seasoningsText),
      steps: linesToList(stepsText),
      memo,
      isAIGenerated: initial?.isAIGenerated ?? false,
      dishPhotos,
      handwrittenPhotos,
      rating,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Section title="基本情報">
        <TextInput
          style={styles.input}
          placeholder="レシピ名"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
        />
        <View style={styles.genreRow}>
          {GENRES.map((g) => (
            <Pressable
              key={g}
              onPress={() => setGenre(g)}
              style={[styles.genreChip, genre === g && styles.genreChipSelected]}
            >
              <Text style={[styles.genreChipText, genre === g && styles.genreChipTextSelected]}>
                {g}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="参考サイトURL(任意)"
          placeholderTextColor="#999"
          value={sourceURL}
          onChangeText={setSourceURL}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </Section>

      <Section title="評価(10点満点)">
        <RatingPicker rating={rating} onChange={setRating} />
      </Section>

      <Section title="食材(1行に1つ)">
        <TextInput
          style={styles.textArea}
          placeholder={'例:\n鶏もも肉 300g\n玉ねぎ 1個'}
          placeholderTextColor="#999"
          value={ingredientsText}
          onChangeText={setIngredientsText}
          multiline
        />
      </Section>

      <Section title="調味料(1行に1つ)">
        <TextInput
          style={styles.textArea}
          placeholder={'例:\n醤油 大さじ2\nみりん 大さじ1'}
          placeholderTextColor="#999"
          value={seasoningsText}
          onChangeText={setSeasoningsText}
          multiline
        />
      </Section>

      <Section title="手順(1行に1ステップ)">
        <TextInput
          style={styles.textArea}
          placeholder={'例:\n鶏肉を一口大に切る\nフライパンで焼く'}
          placeholderTextColor="#999"
          value={stepsText}
          onChangeText={setStepsText}
          multiline
        />
      </Section>

      <Section title="完成写真">
        <PhotoAttachEditor photos={dishPhotos} onChange={setDishPhotos} />
      </Section>

      <Section title="手書きレシピの写真">
        <PhotoAttachEditor photos={handwrittenPhotos} onChange={setHandwrittenPhotos} />
      </Section>

      <Section title="メモ">
        <TextInput
          style={styles.textArea}
          placeholder="自由メモ"
          placeholderTextColor="#999"
          value={memo}
          onChangeText={setMemo}
          multiline
        />
      </Section>

      <Pressable style={[styles.saveButton, !canSave && styles.saveButtonDisabled]} onPress={save} disabled={!canSave}>
        <Text style={styles.saveButtonText}>保存</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, paddingBottom: 40 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, color: '#666', fontWeight: '600' },
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
  genreChipSelected: { backgroundColor: '#007AFF' },
  genreChipText: { fontSize: 13, color: '#333' },
  genreChipTextSelected: { color: 'white' },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
