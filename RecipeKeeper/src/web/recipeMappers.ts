import type { CookLog, NewRecipeInput, Recipe } from '../types';

export type CookLogRow = {
  id: string;
  recipe_id: string;
  user_id: string;
  date: string;
  tweak: string;
};

export type RecipeRow = {
  id: string;
  user_id: string;
  title: string;
  genre: string;
  source_url: string;
  ingredients: string[] | null;
  seasonings: string[] | null;
  steps: string[] | null;
  memo: string;
  is_ai_generated: boolean;
  dish_photos: string[] | null;
  handwritten_photos: string[] | null;
  created_at: string;
  rating: number | null;
  cook_logs?: CookLogRow[] | null;
};

export function mapCookLogRow(row: CookLogRow): CookLog {
  return { id: row.id, date: row.date, tweak: row.tweak };
}

export function mapRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    genre: row.genre,
    sourceURL: row.source_url,
    ingredients: row.ingredients ?? [],
    seasonings: row.seasonings ?? [],
    steps: row.steps ?? [],
    memo: row.memo,
    isAIGenerated: row.is_ai_generated,
    createdAt: row.created_at,
    dishPhotos: row.dish_photos ?? [],
    handwrittenPhotos: row.handwritten_photos ?? [],
    cookLogs: (row.cook_logs ?? []).map(mapCookLogRow),
    rating: row.rating,
  };
}

export function mapNewRecipeInputToInsert(input: NewRecipeInput, userId: string) {
  return {
    user_id: userId,
    title: input.title,
    genre: input.genre,
    source_url: input.sourceURL,
    ingredients: input.ingredients,
    seasonings: input.seasonings,
    steps: input.steps,
    memo: input.memo,
    is_ai_generated: input.isAIGenerated,
    dish_photos: input.dishPhotos,
    handwritten_photos: input.handwrittenPhotos,
    rating: input.rating,
  };
}
