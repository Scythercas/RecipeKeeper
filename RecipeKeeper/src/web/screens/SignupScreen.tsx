import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '../supabaseClient';

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? '';

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !isLoading;

  async function handleSignup() {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: SITE_URL },
      });
      if (error) throw error;
      setIsDone(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  if (isDone) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>確認メールを送信しました</Text>
        <Text style={styles.subtitle}>
          メール内のリンクを開いて登録を完了してください。完了後、ログイン画面からサインインできます。
        </Text>
        <Pressable style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>ログイン画面へ</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>アカウントを作成</Text>

      <TextInput
        style={styles.input}
        placeholder="メールアドレス"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="パスワード(6文字以上)"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        onSubmitEditing={handleSignup}
      />

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>{isLoading ? '作成中…' : 'アカウントを作成'}</Text>
      </Pressable>

      <Link href="/login">
        <Text style={styles.link}>すでにアカウントをお持ちの方はこちら</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, maxWidth: 400, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: { color: '#ff3b30', fontSize: 13 },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  link: { color: '#007AFF', fontSize: 13, textAlign: 'center', marginTop: 16 },
});
