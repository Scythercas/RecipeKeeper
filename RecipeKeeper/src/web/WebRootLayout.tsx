import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { RecipesProvider } from '../RecipesContext';
import { AuthProvider, useAuth } from './AuthContext';

const AUTH_ROUTES = ['login', 'signup', 'forgot-password', 'reset-password'];

function Gate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const currentRoute = segments[0] ?? '';
    const inAuthRoute = AUTH_ROUTES.includes(currentRoute);

    if (!session && !inAuthRoute) {
      router.replace('/login');
    } else if (session && inAuthRoute && currentRoute !== 'reset-password') {
      router.replace('/');
    }
  }, [session, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}

export default function WebRootLayout() {
  return (
    <AuthProvider>
      <Gate>
        <RecipesProvider>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="reset-password" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="recipe/[id]/index" options={{ title: '' }} />
            <Stack.Screen
              name="recipe/[id]/edit"
              options={{ presentation: 'modal', title: 'レシピを編集' }}
            />
            <Stack.Screen name="recipe/new" options={{ presentation: 'modal', title: '新規レシピ' }} />
          </Stack>
        </RecipesProvider>
      </Gate>
    </AuthProvider>
  );
}
