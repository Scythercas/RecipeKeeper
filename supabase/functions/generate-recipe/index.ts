import { createClient } from 'jsr:@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DAILY_LIMIT = Number(Deno.env.get('DAILY_AI_LIMIT') ?? '5');
const MAX_INGREDIENTS = 30;
const MAX_SEASONINGS = 30;
const MAX_NOTE_LENGTH = 300;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// URLからのレシピ取り込みでページを直接fetchする際に使う、実ブラウザに近いヘッダー。
// src/claude.ts側にも同じ値がある(ネイティブとDeno環境で別ファイルのため複製)。
const PAGE_FETCH_HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'accept-language': 'ja,en-US;q=0.9,en;q=0.8',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: '認証が必要です。' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: '認証に失敗しました。' }, 401);
  }
  const userId = userData.user.id;

  // レート制限はservice roleのみが実行できるDB関数で判定する(クライアントからは直接呼べない)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: allowed, error: rpcError } = await adminClient.rpc('try_consume_ai_generation', {
    p_user_id: userId,
    p_daily_cap: DAILY_LIMIT,
  });
  if (rpcError) {
    return jsonResponse({ error: '利用状況の確認に失敗しました。' }, 500);
  }
  if (!allowed) {
    return jsonResponse(
      { error: `1日の生成回数の上限(${DAILY_LIMIT}回)に達しました。また明日お試しください。` },
      429
    );
  }

  let body: {
    availableIngredients?: unknown;
    defaultSeasonings?: unknown;
    requestNote?: unknown;
    importUrl?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'リクエストの形式が不正です。' }, 400);
  }

  let prompt: string;

  if (typeof body.importUrl === 'string' && body.importUrl.trim()) {
    const url = body.importUrl.trim();

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return jsonResponse({ error: 'URLの形式が正しくありません。' }, 400);
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || isBlockedHost(parsedUrl.hostname)) {
      return jsonResponse({ error: 'このURLは利用できません。' }, 400);
    }

    let html: string;
    try {
      const pageResponse = await fetch(url, { headers: PAGE_FETCH_HEADERS });
      if (!pageResponse.ok) {
        return jsonResponse({ error: `ページの取得に失敗しました(HTTP ${pageResponse.status})` }, 502);
      }
      html = await pageResponse.text();
    } catch {
      return jsonResponse({ error: 'ページの取得に失敗しました。URLを確認してください。' }, 502);
    }

    const pageText = extractPageText(html);
    if (pageText.length < 20) {
      return jsonResponse({ error: 'ページからレシピらしいテキストを取得できませんでした。' }, 422);
    }

    prompt = buildImportPrompt(url, pageText);
  } else {
    const availableIngredients = (Array.isArray(body.availableIngredients) ? body.availableIngredients : [])
      .slice(0, MAX_INGREDIENTS)
      .map(String);
    const defaultSeasonings = (Array.isArray(body.defaultSeasonings) ? body.defaultSeasonings : [])
      .slice(0, MAX_SEASONINGS)
      .map(String);
    const requestNote = String(body.requestNote ?? '').slice(0, MAX_NOTE_LENGTH);

    if (availableIngredients.length === 0) {
      return jsonResponse({ error: '食材を入力してください。' }, 400);
    }

    prompt = buildIngredientsPrompt(availableIngredients, defaultSeasonings, requestNote);
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      // 定型のJSON出力タスクなので、Sonnet相当より軽量・高速なHaikuで十分な品質が出る。
      // 生成が遅いという指摘を受けての変更(2026年7月)。
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return jsonResponse({ error: `APIエラー: HTTP ${response.status}: ${detail.slice(0, 200)}` }, 502);
  }

  const json = await response.json();
  const text: string = (json.content ?? [])
    .filter((block: { type: string }) => block.type === 'text')
    .map((block: { text: string }) => block.text)
    .join('');
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return jsonResponse({ error: 'レシピの解析に失敗しました。もう一度お試しください。' }, 502);
  }
  if (typeof parsed.error === 'string') {
    return jsonResponse({ error: parsed.error }, 422);
  }
  return jsonResponse(parsed, 200);
});

function buildIngredientsPrompt(
  availableIngredients: string[],
  defaultSeasonings: string[],
  requestNote: string
): string {
  const seasoningNote = defaultSeasonings.length > 0 ? defaultSeasonings.join('、') : '特になし';

  return `あなたは家庭料理のレシピ作成アシスタントです。以下の条件でレシピを1つ考えてください。

## 手元にある食材
${availableIngredients.join('、')}

## 常備している調味料(これらは追加購入なしで使える前提)
${seasoningNote}

## リクエスト
${requestNote || '特になし'}

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

// エッジ関数が任意のURLをサーバー側からfetchするため、SSRF対策として
// localhost・プライベートIP・クラウドメタデータIPへのアクセスを拒否する。
// (DNSリバインディングまでは防げない簡易チェックだが、無いよりは大きく安全)
function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true;
  if (lower === '0.0.0.0' || lower === '169.254.169.254') return true;
  if (lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd')) return true;

  const ipv4 = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
  }
  return false;
}
