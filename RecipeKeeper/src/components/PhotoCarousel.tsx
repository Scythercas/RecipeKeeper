import React, { useState } from 'react';
import { Image, type LayoutChangeEvent, ScrollView, StyleSheet } from 'react-native';

// 以前はDimensions.get('window').widthで画面幅いっぱいに表示していたが、
// カード型レイアウトへの移行(2026年7月)でこの画面自体に左右パディングが付いたため、
// 実際に描画された自分の幅をonLayoutで測って使うようにした(カード内ネストにも対応できる)。
export default function PhotoCarousel({ photos }: { photos: string[] }) {
  const [width, setWidth] = useState(0);

  function handleLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={styles.carousel}
      onLayout={handleLayout}
    >
      {photos.map((uri) => (
        <Image key={uri} source={{ uri }} style={[styles.photo, { width }]} resizeMode="cover" />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  carousel: { height: 220, borderRadius: 14, overflow: 'hidden' },
  photo: { height: 220 },
});
