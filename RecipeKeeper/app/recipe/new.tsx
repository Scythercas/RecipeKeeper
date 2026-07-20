import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';

import RecipeForm from '../../src/components/RecipeForm';
import { useRecipes } from '../../src/RecipesContext';
import type { NewRecipeInput } from '../../src/types';

export default function NewRecipeScreen() {
  const { addRecipe } = useRecipes();
  const router = useRouter();

  async function handleSave(input: NewRecipeInput) {
    try {
      await addRecipe(input);
      router.back();
    } catch (e) {
      Alert.alert('保存に失敗しました', e instanceof Error ? e.message : String(e));
    }
  }

  return <RecipeForm onSave={handleSave} />;
}
