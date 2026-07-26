import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { confirmDialog } from '../../dialog';
import { loadDefaultSeasonings, saveDefaultSeasonings } from '../../storage';
import { cardStyle, colors } from '../../theme';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';

const BASIC_SEASONINGS = [
  '醤油', 'みりん', '料理酒', '砂糖', '塩', 'こしょう',
  '味噌', '酢', 'サラダ油', 'ごま油', 'オリーブオイル',
  'めんつゆ', '鶏ガラスープの素', 'コンソメ', 'マヨネーズ', 'ケチャップ',
];

export default function SettingsScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [seasonings, setSeasonings] = useState<string[]>([]);
  const [newSeasoning, setNewSeasoning] = useState('');
  const [isSeasoningsOpen, setIsSeasoningsOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [aiPoints, setAiPoints] = useState<number | null>(null);

  useEffect(() => {
    loadDefaultSeasonings().then(setSeasonings);
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from('ai_points')
      .select('points')
      .eq('user_id', session.user.id)
      .single()
      .then(({ data }) => setAiPoints(data?.points ?? null));
  }, [session?.user.id]);

  async function handleDeleteAccount() {
    const confirmed = await confirmDialog(
      '本当にアカウントを削除しますか?',
      '保存されているレシピ・調理記録・写真もすべて削除され、元に戻せません。',
      '削除'
    );
    if (!confirmed) return;

    setDeleteAccountError(null);
    setIsDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        let message = error.message;
        try {
          const errBody = await (error as { context?: Response }).context?.json();
          if (errBody?.error) message = errBody.error;
        } catch {
          // レスポンス本文が読めない場合はデフォルトのエラーメッセージのまま
        }
        throw new Error(message);
      }
      await supabase.auth.signOut();
    } catch (e) {
      setDeleteAccountError(e instanceof Error ? e.message : String(e));
      setIsDeletingAccount(false);
    }
  }

  function persist(next: string[]) {
    setSeasonings(next);
    saveDefaultSeasonings(next);
  }

  function addSeasoning() {
    const trimmed = newSeasoning.trim();
    if (!trimmed || seasonings.includes(trimmed)) {
      setNewSeasoning('');
      return;
    }
    persist([...seasonings, trimmed]);
    setNewSeasoning('');
  }

  function removeSeasoning(item: string) {
    persist(seasonings.filter((s) => s !== item));
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.cardTitle}>👤 アカウント</Text>
        <Text style={styles.accountEmail}>{session?.user.email}</Text>
        <Pressable onPress={() => supabase.auth.signOut()} hitSlop={8}>
          <Text style={styles.signOutText}>サインアウト</Text>
        </Pressable>
      </Card>

      <Card tint="gold">
        <View style={styles.pointsRow}>
          <Text style={styles.pointsEmoji}>🎫</Text>
          <View style={styles.pointsTextGroup}>
            <Text style={styles.pointsValue}>{aiPoints ?? '—'}</Text>
            <Text style={styles.pointsLabel}>AIポイント</Text>
          </View>
        </View>
        <Text style={styles.pointsFooter}>
          1日1回ログインすると1ポイント増えます。今後追加予定のAIによるレシピ管理補助機能で使用します。
        </Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>🔒 パスワード</Text>
        <Text style={styles.cardFooter}>ログイン用のパスワードを変更します。</Text>
        <Pressable style={styles.navButton} onPress={() => router.push('/change-password')}>
          <Text style={styles.navButtonText}>パスワードを更新</Text>
          <Text style={styles.navButtonChevron}>›</Text>
        </Pressable>
      </Card>

      <Card>
        <Pressable
          style={styles.collapsibleHeader}
          onPress={() => setIsSeasoningsOpen((open) => !open)}
          hitSlop={8}
        >
          <Text style={styles.cardTitle}>
            🧂 常備調味料{seasonings.length > 0 ? `(${seasonings.length})` : ''}
          </Text>
          <Text style={styles.chevron}>{isSeasoningsOpen ? '閉じる ▲' : '表示する ▼'}</Text>
        </Pressable>

        {isSeasoningsOpen && (
          <>
            <Text style={styles.cardFooter}>
              ここに登録した調味料は、AIレシピ生成時に「家にあるもの」として扱われます。
            </Text>
            {seasonings.map((item) => (
              <View key={item} style={styles.seasoningRow}>
                <Text style={styles.seasoningText}>{item}</Text>
                <Pressable onPress={() => removeSeasoning(item)} hitSlop={8}>
                  <Text style={styles.removeText}>削除</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="例: 醤油、味噌、ごま油…"
                placeholderTextColor="#999"
                value={newSeasoning}
                onChangeText={setNewSeasoning}
                onSubmitEditing={addSeasoning}
                autoComplete="off"
                textContentType="none"
              />
              <Pressable
                style={[styles.addButton, !newSeasoning.trim() && styles.disabled]}
                onPress={addSeasoning}
                disabled={!newSeasoning.trim()}
              >
                <Text style={styles.addButtonText}>追加</Text>
              </Pressable>
            </View>
            {seasonings.length === 0 && (
              <Pressable style={styles.bulkButton} onPress={() => persist(BASIC_SEASONINGS)}>
                <Text style={styles.bulkButtonText}>基本の調味料をまとめて登録</Text>
              </Pressable>
            )}
          </>
        )}
      </Card>

      <Card tint="danger">
        <Text style={styles.cardTitle}>⚠️ アカウントの削除</Text>
        <Text style={styles.cardFooter}>
          保存されているすべてのレシピ・調理記録・写真が完全に削除されます。この操作は取り消せません。
        </Text>
        {deleteAccountError && <Text style={styles.errorText}>{deleteAccountError}</Text>}
        <Pressable
          style={[styles.deleteAccountButton, isDeletingAccount && styles.disabled]}
          onPress={handleDeleteAccount}
          disabled={isDeletingAccount}
        >
          <Text style={styles.deleteAccountButtonText}>
            {isDeletingAccount ? '削除中…' : 'アカウントを削除する'}
          </Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

function Card({
  tint,
  children,
}: {
  tint?: 'gold' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, tint === 'gold' && styles.cardGold, tint === 'danger' && styles.cardDanger]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { ...cardStyle, padding: 16, gap: 8 },
  cardGold: { backgroundColor: colors.goldTint, borderColor: colors.goldTintBorder },
  cardDanger: { borderColor: colors.dangerTintBorder },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  cardFooter: { fontSize: 12, color: '#888', lineHeight: 17 },
  accountEmail: { fontSize: 15, color: colors.textPrimary },
  signOutText: { color: colors.destructive, fontSize: 14, marginTop: 2 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointsEmoji: { fontSize: 34 },
  pointsTextGroup: { flexDirection: 'column' },
  pointsValue: { fontSize: 30, fontWeight: '800', color: colors.goldDark, lineHeight: 34 },
  pointsLabel: { fontSize: 13, color: colors.goldDark, fontWeight: '600' },
  pointsFooter: { fontSize: 12, color: '#9c854f', lineHeight: 17, marginTop: 2 },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 2,
  },
  navButtonText: { fontSize: 15, color: colors.accent, fontWeight: '600' },
  navButtonChevron: { fontSize: 18, color: colors.accent },
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  errorText: { color: colors.destructive, fontSize: 13 },
  seasoningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  seasoningText: { fontSize: 15 },
  removeText: { color: colors.destructive, fontSize: 13 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  addInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  disabled: { opacity: 0.4 },
  addButtonText: { color: 'white', fontWeight: '600' },
  bulkButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  bulkButtonText: { color: colors.accent, fontWeight: '600' },
  deleteAccountButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.destructive,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  deleteAccountButtonText: { color: colors.destructive, fontWeight: '600' },
});
