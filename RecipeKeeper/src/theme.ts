import { StyleSheet } from 'react-native';

// アプリ全体で共有する配色・カードスタイル。設定画面のリデザイン(2026年7月)で
// 採用した「クリーム背景+白いカード」の見た目を他の画面にも展開する際の基準値。
export const colors = {
  background: '#F5F1EA',
  card: '#FFFFFF',
  cardBorder: '#EDE7DD',
  textPrimary: '#222',
  textSecondary: '#666',
  textMuted: '#999',
  accent: '#007AFF',
  destructive: '#ff3b30',
  success: '#34c759',
  gold: '#b8860b',
  goldDark: '#8a6a10',
  goldTint: '#FBF3E0',
  goldTintBorder: '#F0DFB8',
  dangerTintBorder: '#f7d6d3',
} as const;

export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: 14,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.cardBorder,
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;
