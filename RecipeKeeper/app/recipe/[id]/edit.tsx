import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect } from 'react';
import { Alert, Pressable, Text } from 'react-native';

import RecipeForm from '../../../src/components/RecipeForm';
import { useRecipe, useRecipes } from '../../../src/RecipesContext';
import { useToast } from '../../../src/ToastContext';
import type { NewRecipeInput } from '../../../src/types';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useRecipe(id);
  const { updateRecipe, deleteRecipe } = useRecipes();
  const { showToast } = useToast();
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    if (!recipe) return;
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={confirmDelete} hitSlop={8}>
          <Text style={{ color: '#ff3b30', fontSize: 16 }}>削除</Text>
        </Pressable>
      ),
    });
  }, [navigation, recipe]);

  if (!recipe) {
    return <Text style={{ padding: 16 }}>レシピが見つかりません</Text>;
  }

  function confirmDelete() {
    Alert.alert('レシピを削除しますか?', 'この操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: performDelete },
    ]);
  }

  async function performDelete() {
    try {
      await deleteRecipe(recipe!.id);
      showToast('レシピを削除しました');
      router.dismissTo('/');
    } catch (e) {
      Alert.alert('削除に失敗しました', e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSave(input: NewRecipeInput) {
    try {
      await updateRecipe(recipe!.id, input);
      showToast('レシピを更新しました');
      router.back();
    } catch (e) {
      Alert.alert('更新に失敗しました', e instanceof Error ? e.message : String(e));
    }
  }

  return <RecipeForm initial={recipe} onSave={handleSave} />;
}
