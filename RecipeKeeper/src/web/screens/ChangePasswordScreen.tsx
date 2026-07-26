import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { useToast } from '../../ToastContext';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';

export default function ChangePasswordScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordMismatch = confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    newPassword === confirmNewPassword &&
    !isUpdating;

  async function handleSubmit() {
    setError(null);
    if (!session?.user.email) return;
    setIsUpdating(true);
    try {
      // supabase-jsに「現在のパスワードを検証するだけ」のAPIは無いため、
      // 再ログインを本人確認として使う(成功すればセッションが更新される)。
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (verifyError) throw new Error('現在のパスワードが正しくありません。');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      showToast('パスワードを更新しました');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.description}>
        本人確認のため、現在のパスワードの入力が必要です。新しいパスワードは6文字以上にしてください。
      </Text>
      <TextInput
        style={styles.input}
        placeholder="現在のパスワード"
        placeholderTextColor="#999"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="新しいパスワード"
        placeholderTextColor="#999"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="新しいパスワード(確認)"
        placeholderTextColor="#999"
        value={confirmNewPassword}
        onChangeText={setConfirmNewPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={handleSubmit}
      />
      {passwordMismatch && <Text style={styles.errorText}>新しいパスワードが一致しません</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Pressable
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        <Text style={styles.submitButtonText}>{isUpdating ? '更新中…' : '更新する'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  description: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: '#ff3b30', fontSize: 13 },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },
});
