import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useAuth } from '../web/AuthContext';
import { supabase } from '../web/supabaseClient';

const DAILY_LIMIT = Number(process.env.EXPO_PUBLIC_DAILY_AI_LIMIT ?? '5');

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
