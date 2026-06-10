export function readGoogleOAuthEnv(): { clientId: string; clientSecret: string } {
  const clientId = (Deno.env.get('GOOGLE_CLIENT_ID') ?? '').trim();
  const clientSecret = (Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '').trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in Supabase Edge Function secrets.',
    );
  }
  return { clientId, clientSecret };
}

export async function probeGoogleOAuthCredentials(
  clientId: string,
  clientSecret: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: 'probe',
      grant_type: 'refresh_token',
    }).toString(),
  });
  const text = await res.text();
  if (/invalid_client|OAuth client was not found/i.test(text)) {
    return { ok: false, reason: 'invalid_client' };
  }
  if (/invalid_grant|expired|revoked/i.test(text)) {
    return { ok: true };
  }
  return { ok: false, reason: `unexpected (${res.status}): ${text.slice(0, 120)}` };
}

export function googleOAuthConfigReport(clientId: string): {
  clientIdLength: number;
  clientIdSuffix: string;
} {
  return {
    clientIdLength: clientId.length,
    clientIdSuffix: clientId.length > 24 ? clientId.slice(-40) : clientId,
  };
}
