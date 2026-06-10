import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { readGoogleOAuthEnv } from '../_shared/googleOAuthEnv.ts';
import { getSupabaseAdmin, getSupabaseUser } from '../_shared/supabaseAdmin.ts';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function mergeScopes(existing: string, incoming: string): string {
  const parts = new Set(
    `${existing} ${incoming}`.split(/\s+/).map((s) => s.trim()).filter(Boolean),
  );
  return [...parts].join(' ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const userClient = getSupabaseUser(req);
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const code = String(body.code ?? '').trim();
    const redirectUri = String(body.redirectUri ?? '').trim();
    if (!code || !redirectUri) {
      return jsonResponse({ error: 'code and redirectUri are required.' }, 400);
    }

    const { clientId, clientSecret } = readGoogleOAuthEnv();

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      const msg = String(tokens.error_description ?? tokens.error ?? 'Google token exchange failed.');
      return jsonResponse({ error: msg }, 400);
    }

    const accessToken = String(tokens.access_token ?? '');
    const incomingScopes = String(tokens.scope ?? '').trim();
    let refreshToken = String(tokens.refresh_token ?? '');

    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from('gmail_oauth_tokens')
      .select('provider_refresh_token, scopes')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!refreshToken) {
      refreshToken = String(existing?.provider_refresh_token ?? '');
    }
    if (!refreshToken) {
      return jsonResponse({
        error: 'Google did not return a refresh token. Sign in again and approve all Gmail permissions (including Manage your mail).',
      }, 400);
    }

    const mergedScopes = mergeScopes(String(existing?.scopes ?? ''), incomingScopes);
    let hasModify = mergedScopes.includes('gmail.modify');
    if (!hasModify && accessToken) {
      try {
        const infoRes = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
        );
        if (infoRes.ok) {
          const info = await infoRes.json();
          const liveScope = String(info.scope ?? '');
          hasModify =
            liveScope.includes('gmail.modify') ||
            liveScope.includes('https://www.googleapis.com/auth/gmail.modify');
        }
      } catch {
        /* keep mergedScopes result */
      }
    }

    const row: Record<string, string> = {
      user_id: user.id,
      provider_token: accessToken,
      provider_refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    };
    if (mergedScopes) row.scopes = mergedScopes;

    const { error: upsertErr } = await admin.from('gmail_oauth_tokens').upsert(row, { onConflict: 'user_id' });

    if (upsertErr) {
      const { error: fallbackErr } = await admin.from('gmail_oauth_tokens').upsert(
        {
          user_id: user.id,
          provider_token: accessToken,
          provider_refresh_token: refreshToken,
          scopes: mergedScopes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      if (fallbackErr) {
        return jsonResponse({
          error: `Could not store Gmail tokens. (${fallbackErr.message})`,
        }, 500);
      }
    }

    return jsonResponse({ ok: true, hasModify, scopes: mergedScopes });
  } catch (e) {
    console.error('[gmail-oauth-exchange]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
