import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  isSelected: boolean;
  onPress: () => void;
};

export default function FilterChip({ label, isSelected, onPress }: Props) {
  return (
    <Pressable style={[styles.chip, isSelected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.label, isSelected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e5e5ea',
  },
  chipSelected: { backgroundColor: '#007AFF' },
  label: { fontSize: 13, color: '#333' },
  labelSelected: { color: 'white' },
});
