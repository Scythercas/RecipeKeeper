import { useRouter } from 'expo-router';
import React from 'react';

import RecipeForm from '../../src/components/RecipeForm';
import { useRecipes } from '../../src/RecipesContext';
import type { NewRecipeInput } from '../../src/types';

export default function NewRecipeScreen() {
  const { addRecipe } = useRecipes();
  const router = useRouter();

  function handleSave(input: NewRecipeInput) {
    addRecipe(input);
    router.back();
  }

  return <RecipeForm onSave={handleSave} />;
}
