// expo-routerは「.web.tsxだけでプレーンな.tsxが無いルート」を許容しないため、
// forgot-password.web.tsx用のフォールバックとして最小限のダミーを置く。ネイティブでは
// _layout.tsx がこのルートを一切参照しないため、実際に表示されることはない。
import React from 'react';
import { Text, View } from 'react-native';

export default function ForgotPasswordFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text>この画面はWeb版でのみ利用できます。</Text>
    </View>
  );
}
