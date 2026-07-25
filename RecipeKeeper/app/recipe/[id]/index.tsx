import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import PhotoAttachEditor from '../../../src/components/PhotoAttachEditor';
import PhotoCarousel from '../../../src/components/PhotoCarousel';
import RatingPicker from '../../../src/components/RatingPicker';
import { useRecipe, useRecipes } from '../../../src/RecipesContext';
import { useToast } from '../../../src/ToastContext';
import { cookCount } from '../../../src/types';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useRecipe(id);
  const { addCookLog, deleteCookLog, rateRecipe } = useRecipes();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const router = useRouter();

  const [showCookModal, setShowCookModal] = useState(false);
  const [tweak, setTweak] = useState('');
  const [modalRating, setModalRating] = useState<number | null>(null);
  const [logPhotos, setLogPhotos] = useState<string[]>([]);

  useLayoutEffect(() => {
    if (!recipe) return;
    navigation.setOptions({
      title: recipe.title,
      headerRight: () => (
        <Pressable onPress={() => router.push({ pathname: '/recipe/[id]/edit', params: { id: recipe.id } })}>
          <Text style={styles.headerButton}>編集</Text>
        </Pressable>
      ),
    });
  }, [navigation, recipe, router]);

  if (!recipe) {
    return (
      <View style={styles.center}>
        <Text>レシピが見つかりません</Text>
      </View>
    );
  }

  function openCookModal() {
    setTweak('');
    setModalRating(recipe!.rating);
    setLogPhotos([]);
    setShowCookModal(true);
  }

  async function recordCook() {
    try {
      await addCookLog(recipe!.id, tweak.trim(), logPhotos);
      if (modalRating !== recipe!.rating) {
        await rateRecipe(recipe!.id, modalRating);
      }
      setTweak('');
      setLogPhotos([]);
      setShowCookModal(false);
      showToast('調理を記録しました');
    } catch (e) {
      Alert.alert('記録に失敗しました', e instanceof Error ? e.message : String(e));
    }
  }

  async function removeCookLog(cookLogId: string) {
    try {
      await deleteCookLog(recipe!.id, cookLogId);
      showToast('記録を削除しました');
    } catch (e) {
      Alert.alert('削除に失敗しました', e instanceof Error ? e.message : String(e));
    }
  }

  const sortedLogs = [...recipe.cookLogs].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {recipe.dishPhotos.length > 0 && <PhotoCarousel photos={recipe.dishPhotos} />}

        <View style={styles.section}>
          <View style={styles.metaRow}>
            <View style={styles.genreBadges}>
              {recipe.genres.map((g) => (
                <Text key={g} style={styles.genreBadge}>
                  {g}
                </Text>
              ))}
            </View>
            <View style={styles.metaRightGroup}>
              {recipe.rating !== null && <Text style={styles.ratingText}>⭐ {recipe.rating} / 10</Text>}
              <Text style={styles.cookCountText}>🔥 {cookCount(recipe)}回作った</Text>
            </View>
          </View>
          {recipe.sourceURL.length > 0 && (
            <Pressable onPress={() => Linking.openURL(recipe.sourceURL)}>
              <Text style={styles.link}>🔗 参考サイトを開く</Text>
            </Pressable>
          )}
        </View>

        {recipe.handwrittenPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>手書きレシピ</Text>
            <PhotoCarousel photos={recipe.handwrittenPhotos} />
          </View>
        )}

        <ListSection title="食材" items={recipe.ingredients} />
        <ListSection title="調味料" items={recipe.seasonings} />

        {recipe.steps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>手順</Text>
            {recipe.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {recipe.memo.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>メモ</Text>
            <Text style={styles.bodyText}>{recipe.memo}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>調理記録・工夫</Text>
          {sortedLogs.length === 0 ? (
            <Text style={styles.emptyLogText}>まだ記録がありません</Text>
          ) : (
            sortedLogs.map((log) => (
              <View key={log.id} style={styles.logRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logDate}>
                    {new Date(log.date).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  {log.tweak.length > 0 && <Text style={styles.logTweak}>💡 {log.tweak}</Text>}
                  {log.photos.length > 0 && (
                    <View style={styles.logPhotoRow}>
                      {log.photos.map((uri) => (
                        <Image key={uri} source={{ uri }} style={styles.logPhotoThumb} />
                      ))}
                    </View>
                  )}
                </View>
                <Pressable onPress={() => removeCookLog(log.id)} hitSlop={8}>
                  <Text style={styles.deleteLog}>削除</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.cookButtonBar}>
        <Pressable style={styles.cookButton} onPress={openCookModal}>
          <Text style={styles.cookButtonText}>🍳 作った！</Text>
        </Pressable>
      </View>

      <Modal visible={showCookModal} animationType="slide" transparent onRequestClose={() => setShowCookModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>調理を記録</Text>
              <Text style={styles.modalLabel}>評価(任意)</Text>
              <RatingPicker rating={modalRating} onChange={setModalRating} />
              <Text style={styles.modalLabel}>写真(任意)</Text>
              <PhotoAttachEditor photos={logPhotos} onChange={setLogPhotos} />
              <Text style={styles.modalLabel}>今回の工夫(任意)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="例: 砂糖を半分にして蜂蜜を追加"
                placeholderTextColor="#999"
                value={tweak}
                onChangeText={setTweak}
                multiline
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setShowCookModal(false)}>
                <Text style={styles.modalCancel}>キャンセル</Text>
              </Pressable>
              <Pressable onPress={recordCook}>
                <Text style={styles.modalConfirm}>記録</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, i) => (
        <Text key={i} style={styles.bodyText}>
          {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollContent: { paddingBottom: 100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerButton: { fontSize: 16, color: '#007AFF' },
  section: { paddingHorizontal: 16, paddingVertical: 12, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#eee' },
  sectionTitle: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 4 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  genreBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  metaRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingText: { color: '#b8860b', fontWeight: '600' },
  genreBadge: {
    fontSize: 13,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cookCountText: { color: '#e07a20', fontWeight: '600' },
  link: { color: '#007AFF', marginTop: 4 },
  bodyText: { fontSize: 15, color: '#222', lineHeight: 22 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,122,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
  stepText: { flex: 1, fontSize: 15, lineHeight: 22 },
  emptyLogText: { color: '#999' },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#f0f0f0',
  },
  logDate: { fontSize: 12, color: '#888' },
  logTweak: { fontSize: 14, marginTop: 2 },
  logPhotoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  logPhotoThumb: { width: 56, height: 56, borderRadius: 6 },
  deleteLog: { fontSize: 12, color: '#ff3b30' },
  cookButtonBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  cookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cookButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
    gap: 10,
  },
  modalScrollContent: { gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  modalLabel: { fontSize: 13, color: '#666', marginTop: 8 },
  modalInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  modalCancel: { fontSize: 16, color: '#888' },
  modalConfirm: { fontSize: 16, color: '#007AFF', fontWeight: '700' },
});
