import { useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import FilterChip from '../../src/components/FilterChip';
import RecipeRow from '../../src/components/RecipeRow';
import SwipeableRow from '../../src/components/SwipeableRow';
import { useRecipes } from '../../src/RecipesContext';
import { useToast } from '../../src/ToastContext';
import { cookCount, type Recipe } from '../../src/types';

type SortOrder = 'newest' | 'mostCooked' | 'rating' | 'title';

const SORT_LABELS: Record<SortOrder, string> = {
  newest: '新しい順',
  mostCooked: '作った回数順',
  rating: '評価順',
  title: '名前順',
};

export default function RecipeListScreen() {
  const { recipes, deleteRecipe } = useRecipes();
  const { showToast } = useToast();
  const router = useRouter();
  const navigation = useNavigation();

  const [searchText, setSearchText] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [ingredientFilter, setIngredientFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  async function handleDelete(recipe: Recipe) {
    try {
      await deleteRecipe(recipe.id);
      showToast('レシピを削除しました');
    } catch (e) {
      Alert.alert('削除に失敗しました', e instanceof Error ? e.message : String(e));
    } finally {
      setOpenRowId(null);
    }
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => router.push('/recipe/new')} hitSlop={8}>
          <Text style={styles.headerButton}>＋</Text>
        </Pressable>
      ),
    });
  }, [navigation, router]);

  const genresInUse = useMemo(
    () => Array.from(new Set(recipes.flatMap((r) => r.genres))).sort(),
    [recipes]
  );

  function toggleGenreFilter(g: string) {
    setSelectedGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  const filtered = useMemo(() => {
    let result = recipes;

    if (selectedGenres.length > 0) {
      result = result.filter((r) => selectedGenres.every((g) => r.genres.includes(g)));
    }

    if (ingredientFilter.trim()) {
      const keys = ingredientFilter
        .replace(/、/g, ',')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      result = result.filter((r) => {
        const all = [...r.ingredients, ...r.seasonings].join(' ').toLowerCase();
        return keys.every((k) => all.includes(k.toLowerCase()));
      });
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }

    const sorted = [...result];
    switch (sortOrder) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'mostCooked':
        sorted.sort((a, b) => cookCount(b) - cookCount(a));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
        break;
    }
    return sorted;
  }, [recipes, selectedGenres, ingredientFilter, searchText, sortOrder]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="レシピ名で検索"
        placeholderTextColor="#999"
        value={searchText}
        onChangeText={setSearchText}
      />

      <Text style={styles.ingredientLabel}>カテゴリーで絞り込む(複数選択ですべて含むレシピだけを表示)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
        <View style={styles.genreRow}>
          <FilterChip label="すべて" isSelected={selectedGenres.length === 0} onPress={() => setSelectedGenres([])} />
          {genresInUse.map((genre) => (
            <FilterChip
              key={genre}
              label={genre}
              isSelected={selectedGenres.includes(genre)}
              onPress={() => toggleGenreFilter(genre)}
            />
          ))}
        </View>
      </ScrollView>

      <Text style={styles.ingredientLabel}>食材で絞り込む(すべて含むレシピだけを表示)</Text>
      <TextInput
        style={styles.ingredientInput}
        placeholder="例: 鶏肉, なす"
        placeholderTextColor="#999"
        value={ingredientFilter}
        onChangeText={setIngredientFilter}
      />

      <View style={styles.sortRow}>
        {(Object.keys(SORT_LABELS) as SortOrder[]).map((order) => (
          <Pressable key={order} onPress={() => setSortOrder(order)} style={styles.sortButton}>
            <Text style={[styles.sortLabel, sortOrder === order && styles.sortLabelActive]}>
              {SORT_LABELS[order]}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {recipes.length === 0
              ? 'レシピがありません。右上の＋から追加するか、AIタブで生成できます'
              : '該当なし。フィルタ条件を変えてみてください'}
          </Text>
        </View>
      ) : (
        <FlatList<Recipe>
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <SwipeableRow
              isOpen={openRowId === item.id}
              onOpen={() => setOpenRowId(item.id)}
              onClose={() => setOpenRowId((cur) => (cur === item.id ? null : cur))}
              onDelete={() => handleDelete(item)}
            >
              <Pressable
                onPress={() => {
                  if (openRowId !== null) {
                    setOpenRowId(null);
                    return;
                  }
                  router.push({ pathname: '/recipe/[id]', params: { id: item.id } });
                }}
              >
                <RecipeRow recipe={item} />
              </Pressable>
            </SwipeableRow>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  headerButton: { fontSize: 22, color: '#007AFF', paddingHorizontal: 8 },
  search: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  genreScroll: { marginTop: 12, flexGrow: 0 },
  genreRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  ingredientLabel: {
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  ingredientInput: {
    marginHorizontal: 16,
    marginTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: 8 },
  sortButton: { paddingVertical: 4 },
  sortLabel: { fontSize: 12, color: '#999' },
  sortLabelActive: { color: '#007AFF', fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14, lineHeight: 20 },
});
