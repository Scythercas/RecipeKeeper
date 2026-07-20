// RecipeKeeper Web版が使うプロキシ。Anthropicの本物のAPIキーはこのWorkerの
// シークレット(env.ANTHROPIC_API_KEY)にのみ存在し、ブラウザ側には一切渡さない。
// クライアントは自分だけが知る合言葉(env.APP_SHARED_SECRET)をヘッダーで送り、
// それが一致したリクエストだけをAnthropicへ中継する。

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders(env) });
    }

    const secret = request.headers.get('x-app-secret');
    if (!secret || secret !== env.APP_SHARED_SECRET) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders(env) });
    }

    const body = await request.text();

    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body,
    });

    const responseBody = await upstream.text();
    return new Response(responseBody, {
      status: upstream.status,
      headers: { ...corsHeaders(env), 'content-type': 'application/json' },
    });
  },
};

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN ?? 'https://scythercas.github.io',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-app-secret',
  };
}
