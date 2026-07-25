import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useAuth } from '../web/AuthContext';
import { supabase } from '../web/supabaseClient';

const DAILY_LIMIT = Number(process.env.EXPO_PUBLIC_DAILY_AI_LIMIT ?? '5');

// アプリ所有者本人のアカウントはtry_consume_ai_generation側で上限を実質無制限にしている
// (2026年7月)。表示側もそれに合わせて「残りX/5」ではなく無制限であることを示す。
const UNLIMITED_EMAIL = 'garyo20020124@gmail.com';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AIUsageIndicator({ refreshSignal }: { refreshSignal: number }) {
  const { session } = useAuth();
  const [usedToday, setUsedToday] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('ai_generation_usage')
      .select('count')
      .eq('user_id', session.user.id)
      .eq('day', todayUTC())
      .maybeSingle()
      .then(({ data }) => {
        setUsedToday(data?.count ?? 0);
      });
  }, [session, refreshSignal]);

  if (usedToday === null) return null;

  if (session?.user.email === UNLIMITED_EMAIL) {
    return <Text style={styles.text}>本日の生成回数: {usedToday}回(無制限アカウント)</Text>;
  }

  const remaining = Math.max(0, DAILY_LIMIT - usedToday);

  return (
    <Text style={styles.text}>
      本日の残り生成回数: {remaining} / {DAILY_LIMIT}回
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 12, color: '#888' },
});
