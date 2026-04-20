export default {
  async fetch(request) {
    const ALLOWED_ORIGIN = 'https://bosioagu.github.io';

    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const mlUrl = `https://api.mercadolibre.com${url.pathname}${url.search}`;

    const mlRes = await fetch(mlUrl, {
      headers: {
        'Authorization': request.headers.get('Authorization') ?? '',
        'Accept': 'application/json',
      },
    });

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
