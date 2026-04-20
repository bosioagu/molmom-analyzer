let cachedToken = null;
let tokenExpiry  = 0;

export default {
  async fetch(request, env) {
    const ALLOWED_ORIGIN = 'https://bosioagu.github.io';
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Obtener o renovar token via client_credentials
    if (!cachedToken || Date.now() > tokenExpiry) {
      const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `grant_type=client_credentials&client_id=${env.ML_CLIENT_ID}&client_secret=${env.ML_CLIENT_SECRET}`,
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return new Response(
          JSON.stringify({ error: 'token_error', message: tokenData.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      cachedToken = tokenData.access_token;
      tokenExpiry  = Date.now() + (tokenData.expires_in - 300) * 1000;
    }

    const url   = new URL(request.url);
    const mlUrl = `https://api.mercadolibre.com${url.pathname}${url.search}`;

    const mlRes = await fetch(mlUrl, {
      headers: {
        'Authorization': `Bearer ${cachedToken}`,
        'Accept': 'application/json',
      },
    });

    // Si el token expiró, invalidar caché para el próximo request
    if (mlRes.status === 401) {
      cachedToken = null;
      tokenExpiry  = 0;
    }

    const body = await mlRes.text();
    return new Response(body, {
      status: mlRes.status,
      headers: {
        ...corsHeaders,
        'Content-Type': mlRes.headers.get('Content-Type') ?? 'application/json',
      },
    });
  },
};
