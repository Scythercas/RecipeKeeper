import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_KEY_STORE_KEY = 'anthropic_api_key';

export async function loadApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_STORE_KEY);
}

export async function saveApiKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_STORE_KEY, key);
}

export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
}

// Web版専用。expo-secure-storeはWebでは動作しない(Keychain/Keystore相当が存在しないため)ので、
// 本物のAnthropicキーはブラウザに置かず、自前デプロイのプロキシ(cloudflare-worker/)経由で呼ぶ。
// ここに保存するのは「プロキシのURL」と「プロキシに設定したのと同じ合言葉」のみ。
const PROXY_URL_KEY = 'recipekeeper.proxyUrl.v1';
const PROXY_SECRET_KEY = 'recipekeeper.proxySecret.v1';

export type ProxyConfig = { url: string; secret: string };

export async function loadProxyConfig(): Promise<ProxyConfig | null> {
  const [url, secret] = await Promise.all([
    AsyncStorage.getItem(PROXY_URL_KEY),
    AsyncStorage.getItem(PROXY_SECRET_KEY),
  ]);
  if (!url || !secret) return null;
  return { url, secret };
}

export async function saveProxyConfig(config: ProxyConfig): Promise<void> {
  await AsyncStorage.setItem(PROXY_URL_KEY, config.url);
  await AsyncStorage.setItem(PROXY_SECRET_KEY, config.secret);
}

export async function deleteProxyConfig(): Promise<void> {
  await AsyncStorage.multiRemove([PROXY_URL_KEY, PROXY_SECRET_KEY]);
}

export type GeneratedRecipe = {
  title: string;
  genre: string;
  ingredients: string[];
  seasonings: string[];
  steps: string[];
  point: string;
};

export class ClaudeServiceError extends Error {}

export async function generateRecipe(params: {
  availableIngredients: string[];
  defaultSeasonings: string[];
  requestNote: string;
}): Promise<GeneratedRecipe> {
  const proxyConfig = Platform.OS === 'web' ? await loadProxyConfig() : null;
  const apiKey = Platform.OS === 'web' ? null : await loadApiKey();

  if (Platform.OS === 'web' && !proxyConfig) {
    throw new ClaudeServiceError('プロキシ設定が未登録です。設定タブから登録してください。');
  }
  if (Platform.OS !== 'web' && !apiKey) {
    throw new ClaudeServiceError('APIキーが未設定です。設定タブから登録してください。');
  }

  const seasoningNote = params.defaultSeasonings.length > 0
    ? params.defaultSeasonings.join('、')
    : '特になし';

  const prompt = `あなたは家庭料理のレシピ作成アシスタントです。以下の条件でレシピを1つ考えてください。

## 手元にある食材
${params.availableIngredients.join('、')}

## 常備している調味料(これらは追加購入なしで使える前提)
${seasoningNote}

## リクエスト
${params.requestNote || '特になし'}

## 条件
- 上記の食材と常備調味料だけで作れること(足りない材料を要求しない)
- 分量は2人分を目安に具体的に書く
- 手順は家庭で再現しやすい粒度で書く

## 出力形式
次のJSONのみを出力してください。前置き・後書き・コードブロック記号は一切不要です。
{
  "title": "レシピ名",
  "genre": "和食/洋食/中華/韓国/エスニック/イタリアン/デザート/その他 のいずれか",
  "ingredients": ["食材 分量", ...],
  "seasonings": ["調味料 分量", ...],
  "steps": ["手順1", "手順2", ...],
  "point": "ワンポイントアドバイス"
}`;

  const requestBody = JSON.stringify({
    // 定型のJSON出力タスクなので、Sonnet相当より軽量・高速なHaikuで十分な品質が出る。
    // 生成が遅いという指摘を受けての変更(2026年7月)。
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = proxyConfig
    ? await fetch(proxyConfig.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-app-secret': proxyConfig.secret,
        },
        body: requestBody,
      })
    : await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey as string,
          'anthropic-version': '2023-06-01',
        },
        body: requestBody,
      });

  if (!response.ok) {
    const detail = await response.text();
    throw new ClaudeServiceError(`APIエラー: HTTP ${response.status}: ${detail.slice(0, 200)}`);
  }

  const json = await response.json();
  const text: string = (json.content ?? [])
    .filter((block: { type: string }) => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('');

  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned) as GeneratedRecipe;
  } catch {
    throw new ClaudeServiceError('レシピの解析に失敗しました。もう一度お試しください。');
  }
}
