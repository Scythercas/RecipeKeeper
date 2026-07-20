import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // ホームインジケーター等のセーフエリア分を確保し、タブバーが画面最下端に
  // 張り付いてタップしづらくなるのを防ぐ(Web版はブラウザがセーフエリアを
  // 報告しない場合insetsが0になるが、その場合も最低限の余白は残す)。
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { height: 50 + bottomPadding, paddingBottom: bottomPadding, paddingTop: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'レシピ', tabBarIcon: () => <TabIcon emoji="📖" /> }}
      />
      <Tabs.Screen
        name="ai"
        options={{ title: 'AIで作る', tabBarIcon: () => <TabIcon emoji="✨" /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '設定', tabBarIcon: () => <TabIcon emoji="⚙️" /> }}
      />
    </Tabs>
  );
}
