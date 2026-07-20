import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { saveCompressedPhoto } from '../photoStorage';

type Props = {
  photos: string[];
  onChange: (photos: string[]) => void;
};

export default function PhotoAttachEditor({ photos, onChange }: Props) {
  async function addFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('権限が必要です', 'フォトライブラリへのアクセスを許可してください。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 1,
    });
    if (result.canceled) return;
    await appendAssets(result.assets);
  }

  async function addFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('権限が必要です', 'カメラへのアクセスを許可してください。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return;
    await appendAssets(result.assets);
  }

  async function appendAssets(assets: ImagePicker.ImagePickerAsset[]) {
    const compressed = await Promise.all(
      assets.map((asset) => saveCompressedPhoto(asset.uri, asset.width, asset.height))
    );
    onChange([...photos, ...compressed]);
  }

  function removeAt(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <View style={styles.container}>
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {photos.map((uri, index) => (
              <View key={uri} style={styles.thumbWrapper}>
                <Image source={{ uri }} style={styles.thumb} />
                <Pressable style={styles.removeBadge} onPress={() => removeAt(index)}>
                  <Text style={styles.removeBadgeText}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <View style={styles.buttonsRow}>
        <Pressable style={styles.button} onPress={addFromLibrary}>
          <Text style={styles.buttonText}>ライブラリ</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={addFromCamera}>
          <Text style={styles.buttonText}>カメラ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  thumbWrapper: { position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadgeText: { color: 'white', fontSize: 12, lineHeight: 14 },
  buttonsRow: { flexDirection: 'row', gap: 8 },
  button: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonText: { fontSize: 14 },
});
