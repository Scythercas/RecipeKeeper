import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Recipe } from './types';

const RECIPES_KEY = 'recipekeeper.recipes.v1';
const SEASONINGS_KEY = 'recipekeeper.defaultSeasonings.v1';

// 一般的な日本の家庭にある常備調味料の初期値(未設定時のみ使用)
const DEFAULT_SEASONINGS = [
  '塩',
  '砂糖',
  'しょうゆ',
  'みそ',
  '酢',
  '料理酒',
  'みりん',
  'ごま油',
  'サラダ油',
  'こしょう',
  'だしの素',
  '顆粒コンソメ',
  'マヨネーズ',
  'ケチャップ',
  '片栗粉',
];

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
  if (!raw) return DEFAULT_SEASONINGS;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return DEFAULT_SEASONINGS;
  }
}

export async function saveDefaultSeasonings(seasonings: string[]): Promise<void> {
  await AsyncStorage.setItem(SEASONINGS_KEY, JSON.stringify(seasonings));
}
