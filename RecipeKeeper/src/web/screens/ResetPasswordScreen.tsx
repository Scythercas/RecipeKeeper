import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { supabase } from '../supabaseClient';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  const canSubmit = password.length >= 6 && !isLoading;

  async function handleUpdate() {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
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
        <Text style={styles.title}>パスワードを更新しました</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>レシピ一覧へ</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>新しいパスワードを設定</Text>

      <TextInput
        style={styles.input}
        placeholder="新しいパスワード(6文字以上)"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        onSubmitEditing={handleUpdate}
      />

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <Pressable
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleUpdate}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>{isLoading ? '更新中…' : 'パスワードを更新'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, maxWidth: 400, width: '100%', alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
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
});
