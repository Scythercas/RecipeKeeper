import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { cookCount, type Recipe } from '../types';

export default function RecipeRow({ recipe }: { recipe: Recipe }) {
  const count = cookCount(recipe);
  return (
    <View style={styles.row}>
      {recipe.dishPhotos[0] ? (
        <Image source={{ uri: recipe.dishPhotos[0] }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderText}>🍳</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.title}
          </Text>
          {recipe.isAIGenerated && <Text style={styles.aiBadge}>✨</Text>}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.genreBadge}>{recipe.genre}</Text>
          {recipe.rating !== null && <Text style={styles.ratingBadge}>⭐ {recipe.rating}</Text>}
          {count > 0 && <Text style={styles.cookCount}>🔥 {count}回</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  thumb: { width: 56, height: 56, borderRadius: 8 },
  thumbPlaceholder: { backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { fontSize: 22 },
  info: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
  aiBadge: { fontSize: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  genreBadge: {
    fontSize: 11,
    color: '#555',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cookCount: { fontSize: 11, color: '#e07a20' },
  ratingBadge: { fontSize: 11, color: '#b8860b', fontWeight: '600' },
});
