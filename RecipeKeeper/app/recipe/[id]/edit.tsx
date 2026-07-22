import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text } from 'react-native';

import RecipeForm from '../../../src/components/RecipeForm';
import { useRecipe, useRecipes } from '../../../src/RecipesContext';
import type { NewRecipeInput } from '../../../src/types';

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = useRecipe(id);
  const { updateRecipe } = useRecipes();
  const router = useRouter();

  if (!recipe) {
    return <Text style={{ padding: 16 }}>レシピが見つかりません</Text>;
  }

  async function handleSave(input: NewRecipeInput) {
    try {
      await updateRecipe(recipe!.id, input);
      router.back();
    } catch (e) {
      Alert.alert('更新に失敗しました', e instanceof Error ? e.message : String(e));
    }
  }

  return <RecipeForm initial={recipe} onSave={handleSave} />;
}
