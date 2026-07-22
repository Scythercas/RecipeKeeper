import React from 'react';
import { Dimensions, Image, ScrollView, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

export default function PhotoCarousel({ photos }: { photos: string[] }) {
  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.carousel}
    >
      {photos.map((uri) => (
        <Image key={uri} source={{ uri }} style={styles.photo} resizeMode="cover" />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  carousel: { height: 220 },
  photo: { width, height: 220 },
});
