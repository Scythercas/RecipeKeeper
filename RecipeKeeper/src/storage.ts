import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Recipe } from './types';

const RECIPES_KEY = 'recipekeeper.recipes.v1';
const SEASONINGS_KEY = 'recipekeeper.defaultSeasonings.v1';

export async function loadRecipes(): Promise<Recipe[]> {
  const raw = await AsyncStorage.getItem(RECIPES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Recipe[];
  } catch {
    return [];
  }
}

export async function saveRecipes(recipes: Recipe[]): Promise<void> {
  await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
}

export async function loadDefaultSeasonings(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SEASONINGS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function saveDefaultSeasonings(seasonings: string[]): Promise<void> {
  await AsyncStorage.setItem(SEASONINGS_KEY, JSON.stringify(seasonings));
}
