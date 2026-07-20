import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { deletePhoto } from './photoStorage';
import type { NewRecipeInput, Recipe } from './types';
import { useAuth } from './web/AuthContext';
import {
  type CookLogRow,
  mapCookLogRow,
  mapNewRecipeInputToInsert,
  mapRecipeRow,
  type RecipeRow,
} from './web/recipeMappers';
import { supabase } from './web/supabaseClient';

type RecipesContextValue = {
  recipes: Recipe[];
  isLoaded: boolean;
  addRecipe: (input: NewRecipeInput) => Promise<Recipe>;
  updateRecipe: (id: string, input: NewRecipeInput) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  addCookLog: (recipeId: string, tweak: string) => Promise<void>;
  deleteCookLog: (recipeId: string, cookLogId: string) => Promise<void>;
};

const RecipesContext = createContext<RecipesContextValue | null>(null);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setRecipes([]);
      setIsLoaded(true);
      return;
    }
    setIsLoaded(false);
    supabase
      .from('recipes')
      .select('*, cook_logs(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.warn('recipes fetch failed', error.message);
          setRecipes([]);
        } else {
          setRecipes(((data ?? []) as RecipeRow[]).map(mapRecipeRow));
        }
        setIsLoaded(true);
      });
  }, [userId]);

  const addRecipe = useCallback(
    async (input: NewRecipeInput): Promise<Recipe> => {
      if (!userId) throw new Error('ログインが必要です。');
      const { data, error } = await supabase
        .from('recipes')
        .insert(mapNewRecipeInputToInsert(input, userId))
        .select('*, cook_logs(*)')
        .single();
      if (error || !data) throw new Error(error?.message ?? 'レシピの保存に失敗しました。');
      const recipe = mapRecipeRow(data as RecipeRow);
      setRecipes((prev) => [recipe, ...prev]);
      return recipe;
    },
    [userId]
  );

  const updateRecipe = useCallback(
    async (id: string, input: NewRecipeInput): Promise<void> => {
      if (!userId) throw new Error('ログインが必要です。');
      const { error } = await supabase
        .from('recipes')
        .update(mapNewRecipeInputToInsert(input, userId))
        .eq('id', id);
      if (error) throw new Error(error.message);
      setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...input } : r)));
    },
    [userId]
  );

  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      const target = recipes.find((r) => r.id === id);
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw new Error(error.message);
      target?.dishPhotos.forEach(deletePhoto);
      target?.handwrittenPhotos.forEach(deletePhoto);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    },
    [recipes]
  );

  const addCookLog = useCallback(
    async (recipeId: string, tweak: string): Promise<void> => {
      if (!userId) throw new Error('ログインが必要です。');
      const { data, error } = await supabase
        .from('cook_logs')
        .insert({ recipe_id: recipeId, user_id: userId, tweak })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? '記録に失敗しました。');
      const log = mapCookLogRow(data as CookLogRow);
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, cookLogs: [...r.cookLogs, log] } : r))
      );
    },
    [userId]
  );

  const deleteCookLog = useCallback(async (recipeId: string, cookLogId: string): Promise<void> => {
    const { error } = await supabase.from('cook_logs').delete().eq('id', cookLogId);
    if (error) throw new Error(error.message);
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId
          ? { ...r, cookLogs: r.cookLogs.filter((log) => log.id !== cookLogId) }
          : r
      )
    );
  }, []);

  return (
    <RecipesContext.Provider
      value={{ recipes, isLoaded, addRecipe, updateRecipe, deleteRecipe, addCookLog, deleteCookLog }}
    >
      {children}
    </RecipesContext.Provider>
  );
}

export function useRecipes(): RecipesContextValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes must be used within a RecipesProvider');
  return ctx;
}

export function useRecipe(id: string | undefined): Recipe | undefined {
  const { recipes } = useRecipes();
  return recipes.find((r) => r.id === id);
}
