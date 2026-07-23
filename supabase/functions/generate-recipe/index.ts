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

  let body: { availableIngredients?: unknown; defaultSeasonings?: unknown; requestNote?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'リクエストの形式が不正です。' }, 400);
  }

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

  const seasoningNote = defaultSeasonings.length > 0 ? defaultSeasonings.join('、') : '特になし';

  const prompt = `あなたは家庭料理のレシピ作成アシスタントです。以下の条件でレシピを1つ考えてください。

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

  try {
    const parsed = JSON.parse(cleaned);
    return jsonResponse(parsed, 200);
  } catch {
    return jsonResponse({ error: 'レシピの解析に失敗しました。もう一度お試しください。' }, 502);
  }
});
