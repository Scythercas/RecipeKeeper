import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { cardStyle, colors } from '../../theme';
import { supabase } from '../supabaseClient';

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? '';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const canSubmit = email.trim().length > 0 && !isLoading;

  async function handleSend() {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${SITE_URL}/reset-password`,
      });
      if (error) throw error;
      setIsSent(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  if (isSent) {
    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>再設定メールを送信しました</Text>
          <Text style={styles.subtitle}>メール内のリンクから新しいパスワードを設定してください。</Text>
          <Link href="/login">
            <Text style={styles.link}>ログイン画面に戻る</Text>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>パスワードを再設定</Text>
        <Text style={styles.subtitle}>登録済みのメールアドレスに再設定用のリンクを送信します。</Text>

        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onSubmitEditing={handleSend}
        />

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={!canSubmit}
        >
          <Text style={styles.buttonText}>{isLoading ? '送信中…' : '再設定メールを送る'}</Text>
        </Pressable>

        <Link href="/login">
          <Text style={styles.link}>ログイン画面に戻る</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { ...cardStyle, padding: 24, gap: 12, maxWidth: 400, width: '100%' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: { color: colors.destructive, fontSize: 13 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  link: { color: colors.accent, fontSize: 13, textAlign: 'center', marginTop: 16 },
});
