import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  rating: number | null;
  onChange: (rating: number | null) => void;
};

export default function RatingPicker({ rating, onChange }: Props) {
  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(rating === n ? null : n)}
            style={[styles.chip, rating !== null && rating >= n && styles.chipSelected]}
          >
            <Text style={[styles.chipText, rating !== null && rating >= n && styles.chipTextSelected]}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.summary}>
        {rating !== null ? `${rating} / 10点` : '未評価(タップして採点)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: '#ffb300' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextSelected: { color: 'white', fontWeight: '700' },
  summary: { fontSize: 13, color: '#666', marginTop: 6 },
});
