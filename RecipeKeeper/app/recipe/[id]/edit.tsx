import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

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

  function handleSave(input: NewRecipeInput) {
    updateRecipe(recipe!.id, input);
    router.back();
  }

  return <RecipeForm initial={recipe} onSave={handleSave} />;
}
