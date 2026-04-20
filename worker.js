let cachedToken = null;
let tokenExpiry  = 0;

async function getToken(env) {
  if (cachedToken && Date.now() < tokenExpiry) return { ok: true, token: cachedToken };

  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: `grant_type=client_credentials&client_id=${env.ML_CLIENT_ID}&client_secret=${env.ML_CLIENT_SECRET}`,
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) return { ok: false, status: tokenRes.status, data: tokenData };

  cachedToken = tokenData.access_token;
  tokenExpiry  = Date.now() + (tokenData.expires_in - 300) * 1000;
  return { ok: true, token: cachedToken, tokenType: tokenData.token_type, expiresIn: tokenData.expires_in };
}

export default {
  async fetch(request, env) {
    const ALLOWED_ORIGIN = 'https://bosioagu.github.io';
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ── /debug: diagnóstico completo ──────────────────────────────────────────
    if (url.pathname === '/debug') {
      const hasClientId     = !!env.ML_CLIENT_ID;
      const hasClientSecret = !!env.ML_CLIENT_SECRET;
      const tokenResult     = await getToken(env);

      let searchResult = null;
      if (tokenResult.ok) {
        const mlRes  = await fetch(
          'https://api.mercadolibre.com/sites/MLA/search?q=test&limit=1',
          { headers: { 'Authorization': `Bearer ${tokenResult.token}`, 'Accept': 'application/json' } }
        );
        const body   = await mlRes.text();
        searchResult = { status: mlRes.status, body: JSON.parse(body) };
      }

      return new Response(JSON.stringify({
        secrets:      { hasClientId, hasClientSecret },
        clientIdSnip: env.ML_CLIENT_ID ? env.ML_CLIENT_ID.toString().slice(0, 6) + '...' : null,
        token:        tokenResult,
        search:       searchResult,
      }, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── proxy normal ──────────────────────────────────────────────────────────
    const tokenResult = await getToken(env);
    if (!tokenResult.ok) {
      return new Response(JSON.stringify({ error: 'token_error', detail: tokenResult }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mlUrl  = `https://api.mercadolibre.com${url.pathname}${url.search}`;
    const mlRes  = await fetch(mlUrl, {
      headers: { 'Authorization': `Bearer ${tokenResult.token}`, 'Accept': 'application/json' },
    });

    if (mlRes.status === 401) { cachedToken = null; tokenExpiry = 0; }

    const body = await mlRes.text();
    return new Response(body, {
      status: mlRes.status,
      headers: { ...corsHeaders, 'Content-Type': mlRes.headers.get('Content-Type') ?? 'application/json' },
    });
  },
};
