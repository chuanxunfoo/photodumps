import { corsHeaders } from '../_shared/cors.ts';

/** Google OAuth redirect target (https). Returns HTML that deep-links back into the app. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const q = url.search;
  const hash = url.hash;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connecting Gmail…</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b1020; color: #e8ecff; display: grid; place-items: center; min-height: 100vh; margin: 0; }
    p { opacity: 0.85; text-align: center; padding: 0 20px; }
  </style>
</head>
<body>
  <p>Returning to photodumps…</p>
  <script>
    (function () {
      var q = ${JSON.stringify(q)};
      var hash = ${JSON.stringify(hash)};
      var extra = hash && hash.indexOf('code=') !== -1 ? hash.replace(/^#/, q ? '&' : '?') : '';
      window.location.replace('dumpit://gmail-callback' + q + extra);
      setTimeout(function () {
        document.querySelector('p').textContent = 'If the app did not open, switch back to photodumps and tap Start scan again.';
      }, 2500);
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
});
