import { createClient } from 'jsr:@supabase/supabase-js@2';

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

  // recipesテーブル等はauth.usersへのon delete cascadeで自動削除されるが、
  // Storageのファイルは外部キーで紐付いていないため、ユーザー削除前に自前で消す必要がある。
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: files, error: listError } = await adminClient.storage.from('recipe-photos').list(userId);
  if (listError) {
    return jsonResponse({ error: `写真の削除準備に失敗しました: ${listError.message}` }, 500);
  }
  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    const { error: removeError } = await adminClient.storage.from('recipe-photos').remove(paths);
    if (removeError) {
      return jsonResponse({ error: `写真の削除に失敗しました: ${removeError.message}` }, 500);
    }
  }

  // auth.usersの削除で recipes / cook_logs / ai_generation_usage は
  // on delete cascadeにより自動的に削除される。
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return jsonResponse({ error: `アカウントの削除に失敗しました: ${deleteError.message}` }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
