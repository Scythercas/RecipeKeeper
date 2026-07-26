import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { cardStyle, colors } from '../theme';

const DELETE_WIDTH = 84;
const CARD_RADIUS = 14;

type Props = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onDelete: () => void;
  children: React.ReactNode;
};

// react-native-gesture-handlerを追加せず(依存を増やさない方針)、
// コア標準のPanResponderだけでApple Musicのような「左スワイプで削除ボタン」を実現する。
// onMoveShouldSetPanResponderが横方向の動きだけを拾うため、素早いタップは
// 下のPressable/Linkにそのまま素通りしてナビゲーションが機能する。
export default function SwipeableRow({ isOpen, onOpen, onClose, onDelete, children }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);

  function animateTo(value: number) {
    offsetRef.current = value;
    Animated.spring(translateX, { toValue: value, useNativeDriver: true, bounciness: 0 }).start();
  }

  useEffect(() => {
    if (!isOpen && offsetRef.current !== 0) {
      animateTo(0);
    }
  }, [isOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(-DELETE_WIDTH, Math.min(0, offsetRef.current + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const next = Math.max(-DELETE_WIDTH, Math.min(0, offsetRef.current + gesture.dx));
        const shouldOpen = next < -DELETE_WIDTH / 2;
        animateTo(shouldOpen ? -DELETE_WIDTH : 0);
        if (shouldOpen) {
          onOpen();
        } else {
          onClose();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.deleteBackground}>
        <Pressable style={styles.deleteButton} onPress={onDelete} hitSlop={8}>
          <Text style={styles.deleteText}>削除</Text>
        </Pressable>
      </View>
      <Animated.View style={[styles.content, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center' },
  content: { ...cardStyle, borderRadius: CARD_RADIUS },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    width: DELETE_WIDTH,
    backgroundColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
  },
  deleteText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
