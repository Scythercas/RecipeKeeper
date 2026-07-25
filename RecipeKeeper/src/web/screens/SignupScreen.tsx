import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { supabase } from '../supabaseClient';

const APP_ICON = require('../../../assets/icon.png');

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? '';

const FEATURES = [
  { emoji: '📖', text: '参考サイト・手書きメモ・完成写真をレシピ1件にまとめて保存' },
  { emoji: '🔍', text: 'ジャンルや食材でさっと絞り込み検索' },
  { emoji: '⭐', text: '10点満点で採点して、お気に入り順に並び替え' },
  { emoji: '🍳', text: '「作った!」ボタンで調理回数と工夫メモを記録' },
  { emoji: '✨', text: '今ある食材と調味料からAIが今日の一品を提案' },
];

// 散らかったレシピの出どころ(サイト・料理本・メッセージ・手書き)を
// 少しずつ角度を変えて重ねることで「散在している」感じを表現する。
// 出どころ側は既存の絵文字アイコン方針(CLAUDE.md)を踏襲し、
// 収束先だけ実際のアプリアイコン(assets/icon.png)を表示する。
const SCATTERED_SOURCES = [
  { emoji: '🌐', rotate: '-8deg', top: 0, left: 0 },
  { emoji: '📚', rotate: '6deg', top: 18, left: 54 },
  { emoji: '💬', rotate: '-4deg', top: 60, left: 10 },
  { emoji: '✍️', rotate: '10deg', top: 66, left: 66 },
];

function HeroIllustration() {
  return (
    <View style={styles.illustration}>
      <View style={styles.scatterBox}>
        {SCATTERED_SOURCES.map((s, i) => (
          <View
            key={i}
            style={[
              styles.scatterChip,
              { top: s.top, left: s.left, transform: [{ rotate: s.rotate }] },
            ]}
          >
            <Text style={styles.scatterEmoji}>{s.emoji}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.arrow}>→</Text>
      <View style={styles.organizedCard}>
        <Image source={APP_ICON} style={styles.organizedIcon} />
        <Text style={styles.organizedLabel}>RecipeKeeper</Text>
      </View>
    </View>
  );
}

export default function SignupScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
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

  const formCard = isDone ? (
    <View style={styles.card}>
      <Text style={styles.title}>確認メールを送信しました</Text>
      <Text style={styles.subtitle}>
        メール内のリンクを開いて登録を完了してください。完了後、ログイン画面からサインインできます。
      </Text>
      <Pressable style={styles.button} onPress={() => router.replace('/login')}>
        <Text style={styles.buttonText}>ログイン画面へ</Text>
      </Pressable>
    </View>
  ) : (
    <View style={styles.card}>
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

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={[styles.layout, isWide && styles.layoutWide]}>
        <View style={[styles.heroPane, isWide && styles.heroPaneWide]}>
          <HeroIllustration />
          <Text style={styles.heroTitle}>レシピを、もっと自分らしく。</Text>
          <Text style={styles.heroBody}>
            複数のレシピサイト、料理本、友達とのメッセージのやり取り、手書きのメモ…レシピはあちこちに散らばりがちで、目的の1品を探すだけでひと苦労になっていませんか？{'\n\n'}
            RecipeKeeperなら、散らばったレシピを1か所にまとめて管理できます。今ある食材と常備調味料からAIが今日の一品を提案し、作るたびに工夫メモや点数を記録すれば、あなただけの「殿堂入りレシピ」が育っていきます。
          </Text>
          <View style={styles.featureList}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.formPane, isWide && styles.formPaneWide]}>{formCard}</View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, alignItems: 'center', padding: 24, paddingVertical: 40 },
  layout: { width: '100%', maxWidth: 1040, gap: 32 },
  layoutWide: { flexDirection: 'row', alignItems: 'center' },
  heroPane: { gap: 16 },
  heroPaneWide: { flex: 1.1 },
  formPane: { alignItems: 'center' },
  formPaneWide: { flex: 1 },
  illustration: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  scatterBox: { width: 100, height: 100 },
  scatterChip: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scatterEmoji: { fontSize: 18 },
  arrow: { fontSize: 20, color: '#bbb' },
  organizedCard: {
    width: 88,
    alignItems: 'center',
    gap: 4,
  },
  organizedIcon: { width: 72, height: 72, borderRadius: 16 },
  organizedLabel: { color: '#333', fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#222' },
  heroBody: { fontSize: 14, color: '#555', lineHeight: 22 },
  featureList: { gap: 10, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureEmoji: { fontSize: 16 },
  featureText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 19 },
  card: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
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
