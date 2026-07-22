import { Stack } from 'expo-router';
import React from 'react';

import { RecipesProvider } from '../src/RecipesContext';

export default function RootLayout() {
  return (
    <RecipesProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]/index" options={{ title: '' }} />
        <Stack.Screen
          name="recipe/[id]/edit"
          options={{ presentation: 'modal', title: 'レシピを編集' }}
        />
        <Stack.Screen name="recipe/new" options={{ presentation: 'modal', title: '新規レシピ' }} />
      </Stack>
    </RecipesProvider>
  );
}
