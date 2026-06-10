import { corsHeaders } from '../_shared/cors.ts';

function isAppDeepLink(uri: string): boolean {
  return /^(exp|dumpit|com\.googleusercontent\.apps):\/\//i.test(uri);
}

function buildAppReturn(deepLink: string, code: string): string {
  const sep = deepLink.includes('?') ? '&' : '?';
  return `${deepLink}${sep}code=${encodeURIComponent(code)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fallbackHtml(opts: { appUrl: string; error?: string }): string {
  const appUrl = escapeHtml(opts.appUrl);
  const errorBlock = opts.error
    ? `<p class="err">${escapeHtml(opts.error)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gmail connected</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #12141c;
      color: #f4f6fa;
      min-height: 100vh;
      margin: 0;
      padding: 28px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      max-width: 380px;
      width: 100%;
      background: #1e2430;
      border: 1px solid #3a4254;
      border-radius: 20px;
      padding: 28px 22px;
      text-align: center;
    }
    .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; margin-bottom: 6px; }
    .sub { color: #b8c0d4; font-size: 14px; line-height: 1.55; margin: 0 0 18px; }
    .trust {
      text-align: left;
      background: #12141c;
      border: 1px solid #3a4254;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 20px;
      font-size: 13px;
      line-height: 1.5;
      color: #b8c0d4;
    }
    .trust strong { color: #f4f6fa; }
    .btn {
      display: block;
      width: 100%;
      padding: 15px 16px;
      border-radius: 14px;
      background: #ff0055;
      color: #fff;
      font-size: 16px;
      font-weight: 800;
      text-decoration: none;
      border: none;
    }
    .err { color: #fb7185; font-size: 13px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">photodumps</div>
    <p class="sub">Gmail is connected. Tap below to return to Email Clean and finish setup.</p>
    ${errorBlock}
    <div class="trust">
      <strong>Your inbox is safe.</strong> We only read mail to find clutter, and we only delete small batches after you tap Confirm. You can revoke access anytime in Google Account settings.
    </div>
    <a class="btn" href="${appUrl}">Open photodumps</a>
  </div>
</body>
</html>`;
}

/** Google OAuth redirect - sends user back into the app with the auth code. */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get('code') ?? '';
  const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error') ?? '';
  const returnTo = url.searchParams.get('state')?.trim() || 'dumpit://gmail-callback';

  if (oauthError) {
    const appUrl = isAppDeepLink(returnTo)
      ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${encodeURIComponent(oauthError)}`
      : returnTo;
    return new Response(fallbackHtml({ appUrl, error: oauthError }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  if (code && isAppDeepLink(returnTo)) {
    const appUrl = buildAppReturn(returnTo, code);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: appUrl,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (code) {
    const appUrl = buildAppReturn(returnTo, code);
    return new Response(fallbackHtml({ appUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(fallbackHtml({ appUrl: returnTo, error: 'Missing authorization code from Google.' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
});
