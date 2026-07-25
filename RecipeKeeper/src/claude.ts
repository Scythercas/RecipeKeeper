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

// クラシル・クックパッド・YouTube・レシピ記事等のURLからレシピを取り込む。
// ネイティブはCORSの制約が無いので、ページのHTMLを直接fetchできる
// (Web版はブラウザのCORSに阻まれるため、claude.web.tsはSupabase Edge Function経由でサーバー側fetchする)。
export async function importRecipeFromUrl(url: string): Promise<GeneratedRecipe> {
  const apiKey = await loadApiKey();
  if (!apiKey) {
    throw new ClaudeServiceError('APIキーが未設定です。設定タブから登録してください。');
  }

  const pageText = await fetchPageText(url);
  const prompt = buildImportPrompt(url, pageText);

  const requestBody = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
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

  let parsed: GeneratedRecipe & { error?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ClaudeServiceError('レシピの解析に失敗しました。もう一度お試しください。');
  }
  if (parsed.error) {
    throw new ClaudeServiceError(parsed.error);
  }
  return parsed;
}

async function fetchPageText(url: string): Promise<string> {
  let html: string;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new ClaudeServiceError(`ページの取得に失敗しました(HTTP ${response.status})`);
    }
    html = await response.text();
  } catch (e) {
    if (e instanceof ClaudeServiceError) throw e;
    throw new ClaudeServiceError('ページの取得に失敗しました。URLを確認してください。');
  }

  const pageText = extractPageText(html);
  if (pageText.length < 20) {
    throw new ClaudeServiceError('ページからレシピらしいテキストを取得できませんでした。');
  }
  return pageText;
}

// DOMパーサーを追加せず、正規表現だけでタイトル・meta description・本文テキストを抜き出す簡易実装。
// YouTube等JSでレンダリングされるページは本文が取れないことがあるが、
// title/meta descriptionだけでも抽出の手がかりになるため残す。
function extractPageText(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const ogDescMatch =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);

  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  const parts = [
    titleMatch ? `タイトル: ${titleMatch[1].trim()}` : '',
    descMatch ? `概要: ${descMatch[1].trim()}` : '',
    ogDescMatch ? `OG概要: ${ogDescMatch[1].trim()}` : '',
    bodyText,
  ].filter(Boolean);

  return parts.join('\n\n').slice(0, 8000);
}

function buildImportPrompt(url: string, pageText: string): string {
  return `あなたは家庭料理のレシピ作成アシスタントです。以下はレシピサイトやレシピ動画のページから取得したテキストです。この中からレシピ情報を抽出し、JSON形式で出力してください。

## 取得したページのテキスト(URL: ${url})
${pageText}

## 条件
- ページ内に複数レシピがある場合は、最も主要なレシピ1つを対象にする
- 分量や手順はページの記載をできるだけそのまま使う(不明な場合は無理に創作しない)
- レシピ情報が見つからない場合は、他のフィールドを一切含めず {"error": "レシピ情報が見つかりませんでした"} だけを出力する

## 出力形式
次のJSONのみを出力してください。前置き・後書き・コードブロック記号は一切不要です。
{
  "title": "レシピ名",
  "genre": "和食/洋食/中華/韓国/エスニック/イタリアン/デザート/その他 のいずれか",
  "ingredients": ["食材 分量", ...],
  "seasonings": ["調味料 分量", ...],
  "steps": ["手順1", "手順2", ...],
  "point": "ワンポイントアドバイス(無ければ空文字)"
}`;
}
