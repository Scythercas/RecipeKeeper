import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { generateId } from './id';
import { deletePhoto } from './photoStorage';
import { loadRecipes, saveRecipes } from './storage';
import type { NewRecipeInput, Recipe } from './types';

type RecipesContextValue = {
  recipes: Recipe[];
  isLoaded: boolean;
  addRecipe: (input: NewRecipeInput) => Promise<Recipe>;
  updateRecipe: (id: string, input: NewRecipeInput) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  addCookLog: (recipeId: string, tweak: string) => Promise<void>;
  deleteCookLog: (recipeId: string, cookLogId: string) => Promise<void>;
  rateRecipe: (id: string, rating: number | null) => Promise<void>;
};

const RecipesContext = createContext<RecipesContextValue | null>(null);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const recipesRef = useRef(recipes);
  recipesRef.current = recipes;

  useEffect(() => {
    loadRecipes().then((loaded) => {
      setRecipes(loaded);
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    saveRecipes(recipes);
  }, [recipes, isLoaded]);

  const addRecipe = useCallback(async (input: NewRecipeInput): Promise<Recipe> => {
    const recipe: Recipe = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
      cookLogs: [],
    };
    setRecipes((prev) => [recipe, ...prev]);
    return recipe;
  }, []);

  const updateRecipe = useCallback(async (id: string, input: NewRecipeInput): Promise<void> => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...input } : r))
    );
  }, []);

  const deleteRecipe = useCallback(async (id: string): Promise<void> => {
    const target = recipesRef.current.find((r) => r.id === id);
    target?.dishPhotos.forEach(deletePhoto);
    target?.handwrittenPhotos.forEach(deletePhoto);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addCookLog = useCallback(async (recipeId: string, tweak: string): Promise<void> => {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId
          ? {
              ...r,
              cookLogs: [
                ...r.cookLogs,
                { id: generateId(), date: new Date().toISOString(), tweak },
              ],
            }
          : r
      )
    );
  }, []);

  const deleteCookLog = useCallback(async (recipeId: string, cookLogId: string): Promise<void> => {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === recipeId
          ? { ...r, cookLogs: r.cookLogs.filter((log) => log.id !== cookLogId) }
          : r
      )
    );
  }, []);

  const rateRecipe = useCallback(async (id: string, rating: number | null): Promise<void> => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, rating } : r)));
  }, []);

  return (
    <RecipesContext.Provider
      value={{ recipes, isLoaded, addRecipe, updateRecipe, deleteRecipe, addCookLog, deleteCookLog, rateRecipe }}
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
