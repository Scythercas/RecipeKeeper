import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '../supabaseClient';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isLoading;

  async function handleLogin() {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.replace('/');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RecipeKeeper</Text>
      <Text style={styles.subtitle}>ログイン</Text>

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
        placeholder="パスワード"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        onSubmitEditing={handleLogin}
      />

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>{isLoading ? 'ログイン中…' : 'ログイン'}</Text>
      </Pressable>

      <View style={styles.linksRow}>
        <Link href="/signup">
          <Text style={styles.link}>アカウントを作成</Text>
        </Link>
        <Link href="/forgot-password">
          <Text style={styles.link}>パスワードを忘れた場合</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, maxWidth: 400, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 12 },
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
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  link: { color: '#007AFF', fontSize: 13 },
});
