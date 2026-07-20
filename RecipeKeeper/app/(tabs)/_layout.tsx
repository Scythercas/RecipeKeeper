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
// heightは「中身(アイコン+ラベル)の高さ + 上下の余白」から自動計算する。
// 余白だけを増減させてもアイコン/ラベルの表示スペースが潰れないようにするため、
// heightを固定値にしないこと。
const WEB_TAB_BAR_CONTENT_HEIGHT = 44; // アイコン+ラベルの表示に必要な高さ
const WEB_TAB_BAR_PADDING_TOP = 6;
const WEB_TAB_BAR_PADDING_BOTTOM = 40;
const WEB_TAB_BAR_STYLE =
  Platform.OS === 'web'
    ? {
        height: WEB_TAB_BAR_CONTENT_HEIGHT + WEB_TAB_BAR_PADDING_TOP + WEB_TAB_BAR_PADDING_BOTTOM,
        paddingTop: WEB_TAB_BAR_PADDING_TOP,
        paddingBottom: WEB_TAB_BAR_PADDING_BOTTOM,
      }
    : undefined;

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
