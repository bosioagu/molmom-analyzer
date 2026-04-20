export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://bosioagu.github.io',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url   = new URL(request.url);
    const mlUrl = `https://api.mercadolibre.com${url.pathname}${url.search}`;

    const mlRes = await fetch(mlUrl, {
      headers: {
        'Authorization': request.headers.get('Authorization') ?? '',
        'Accept': 'application/json',
      },
    });

    if (mlRes.status === 401) {
      return new Response(await mlRes.text(), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await mlRes.text();
    return new Response(body, {
      status: mlRes.status,
      headers: { ...corsHeaders, 'Content-Type': mlRes.headers.get('Content-Type') ?? 'application/json' },
    });
  },
};
