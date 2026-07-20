import { Link, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import FilterChip from '../../src/components/FilterChip';
import RecipeRow from '../../src/components/RecipeRow';
import { useRecipes } from '../../src/RecipesContext';
import { cookCount, type Recipe } from '../../src/types';

type SortOrder = 'newest' | 'mostCooked' | 'title';

const SORT_LABELS: Record<SortOrder, string> = {
  newest: '新しい順',
  mostCooked: '作った回数順',
  title: '名前順',
};

export default function RecipeListScreen() {
  const { recipes } = useRecipes();
  const router = useRouter();
  const navigation = useNavigation();

  const [searchText, setSearchText] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [ingredientFilter, setIngredientFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

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
    () => Array.from(new Set(recipes.map((r) => r.genre))).sort(),
    [recipes]
  );

  const filtered = useMemo(() => {
    let result = recipes;

    if (selectedGenre) {
      result = result.filter((r) => r.genre === selectedGenre);
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
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.toLowerCase().includes(q))
      );
    }

    const sorted = [...result];
    switch (sortOrder) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case 'mostCooked':
        sorted.sort((a, b) => cookCount(b) - cookCount(a));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
        break;
    }
    return sorted;
  }, [recipes, selectedGenre, ingredientFilter, searchText, sortOrder]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="レシピ名・食材で検索"
        value={searchText}
        onChangeText={setSearchText}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
        <View style={styles.genreRow}>
          <FilterChip label="すべて" isSelected={selectedGenre === null} onPress={() => setSelectedGenre(null)} />
          {genresInUse.map((genre) => (
            <FilterChip
              key={genre}
              label={genre}
              isSelected={selectedGenre === genre}
              onPress={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
            />
          ))}
        </View>
      </ScrollView>

      <TextInput
        style={styles.ingredientInput}
        placeholder="使う食材で絞り込み(例: 鶏肉, なす)"
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
            <Link href={{ pathname: '/recipe/[id]', params: { id: item.id } }} asChild>
              <Pressable>
                <RecipeRow recipe={item} />
              </Pressable>
            </Link>
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
  ingredientInput: {
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 8 },
  sortButton: { paddingVertical: 4 },
  sortLabel: { fontSize: 12, color: '#999' },
  sortLabelActive: { color: '#007AFF', fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#eee' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14, lineHeight: 20 },
});
