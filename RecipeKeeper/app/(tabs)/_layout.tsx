import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text } from 'react-native';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

// ネイティブはReact Navigationのデフォルトが元々セーフエリアを正しく扱うため触らない。
// Web版はブラウザのセーフエリア報告(env(safe-area-inset-bottom))が環境によって
// 不安定で、動的に高さを変えるとタブバーが画面からはみ出すことがあったため、
// 固定値の余白だけを追加する(はみ出しの心配がない代わりに端末ごとの最適値ではない)。
const WEB_TAB_BAR_STYLE = Platform.OS === 'web' ? { height: 70, paddingBottom: 40, paddingTop: 6 } : undefined;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarStyle: WEB_TAB_BAR_STYLE }}>
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
