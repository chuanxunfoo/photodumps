import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  googleOAuthConfigReport,
  probeGoogleOAuthCredentials,
  readGoogleOAuthEnv,
} from '../_shared/googleOAuthEnv.ts';
import { getSupabaseAdmin, getSupabaseUser } from '../_shared/supabaseAdmin.ts';

type DetoxGroupKey =
  | 'promo_ads'
  | 'spam_phishing'
  | 'newsletter'
  | 'social_digest'
  | 'stale_threads'
  | 'attachments_large'
  | 'old_messages';

type GroupSummary = {
  key: DetoxGroupKey;
  label: string;
  count: number;
  bytes: number;
  capped: boolean;
};

type BatchPreview = {
  batchCount: number;
  batchBytes: number;
  remainingCount: number;
};

const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const SCAN_LIST_MAX = 40;
const SIZE_BATCH = 12;
const CLEANUP_BATCH_MAX = 6;
const SCAN_SIZE_SAMPLE = 16;
const DEFAULT_BYTES_PER_MESSAGE = 48_000;

const CLEANUP_PRIORITY: DetoxGroupKey[] = [
  'spam_phishing',
  'promo_ads',
  'newsletter',
  'social_digest',
  'stale_threads',
  'attachments_large',
  'old_messages',
];

const GROUPS: Array<{ key: DetoxGroupKey; label: string; query: string }> = [
  {
    key: 'promo_ads',
    label: 'Promotions, ads and sponsor mailers',
    query: 'category:promotions older_than:30d',
  },
  {
    key: 'spam_phishing',
    label: 'Spam, phishing and spoof campaigns',
    query: 'in:spam newer_than:365d',
  },
  {
    key: 'newsletter',
    label: 'Unopened newsletter backlog',
    query: 'subject:(newsletter OR digest) is:unread older_than:90d',
  },
  {
    key: 'social_digest',
    label: 'Social digest notification noise',
    query: 'category:social older_than:45d',
  },
  {
    key: 'stale_threads',
    label: 'Stale threads without recent replies',
    query: 'older_than:365d -in:important',
  },
  {
    key: 'attachments_large',
    label: 'Oversized legacy attachments',
    query: 'has:attachment larger:3M older_than:120d',
  },
  {
    key: 'old_messages',
    label: 'Messages older than 2 years',
    query: 'older_than:2y -in:important',
  },
];

function buildAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function mergeScopeStrings(existing: string, incoming: string): string {
  const parts = new Set(
    `${existing} ${incoming}`.split(/\s+/).map((s) => s.trim()).filter(Boolean),
  );
  return [...parts].join(' ');
}

function hasModifyScope(scopes: string): boolean {
  return /gmail\.modify|www\.googleapis\.com\/auth\/gmail\.modify/i.test(scopes);
}

async function accessTokenCanDelete(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) return false;
    const json = await res.json();
    const scope = String(json.scope ?? '');
    return (
      scope.includes('gmail.modify') ||
      scope.includes('https://www.googleapis.com/auth/gmail.modify')
    );
  } catch {
    return false;
  }
}

async function resolveCanDelete(accessToken: string, scopes: string): Promise<boolean> {
  if (hasModifyScope(scopes)) return true;
  if (await accessTokenCanDelete(accessToken)) return true;
  if (!scopes.trim()) return true;
  return false;
}

async function refreshGoogleAccessToken(
  refreshToken: string,
  userId: string,
  storedScopes: string,
): Promise<{ accessToken: string; scopes: string }> {
  const { clientId, clientSecret } = readGoogleOAuthEnv();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    if (/invalid_client|OAuth client was not found/i.test(text)) {
      throw new Error(
        'GMAIL_OAUTH_CONFIG: Google OAuth client ID/secret in Supabase do not match Google Cloud. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Edge Function secrets.',
      );
    }
    if (res.status === 400 && /invalid_grant|expired or revoked/i.test(text)) {
      throw new Error(
        'GMAIL_RECONNECT_REQUIRED: Your Google connection expired. Tap Start scan to sign in to Gmail again.',
      );
    }
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const accessToken = String(json.access_token ?? '');
  if (!accessToken) throw new Error('Google token refresh returned no access_token.');
  const scopes = mergeScopeStrings(storedScopes, String(json.scope ?? ''));

  const admin = getSupabaseAdmin();
  await admin.from('gmail_oauth_tokens').update({
    provider_token: accessToken,
    scopes,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  return { accessToken, scopes };
}

async function getGoogleTokensForUser(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
  scopes: string;
}> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('gmail_oauth_tokens')
    .select('provider_token, provider_refresh_token, scopes, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Could not read google identity token: ${error.message}`);
  if (!data?.provider_token && !data?.provider_refresh_token) {
    throw new Error('Gmail not connected yet. Tap Start scan and sign in to Gmail when prompted.');
  }

  const refreshToken = String(data.provider_refresh_token ?? '');
  if (!refreshToken) {
    throw new Error(
      'Google refresh token missing. Reconnect Google with consent to grant offline Gmail access.',
    );
  }

  const storedScopes = String(data.scopes ?? '');

  try {
    const { accessToken, scopes } = await refreshGoogleAccessToken(refreshToken, userId, storedScopes);
    return { accessToken, refreshToken, scopes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('GMAIL_RECONNECT_REQUIRED') || msg.includes('GMAIL_OAUTH_CONFIG')) {
      await admin.from('gmail_oauth_tokens').delete().eq('user_id', userId);
    }
    throw e;
  }
}

async function gmailGetProfile(accessToken: string): Promise<{ messagesTotal: number; threadsTotal: number }> {
  const res = await fetch(`${GMAIL_API_BASE}/profile`, { headers: buildAuthHeaders(accessToken) });
  if (!res.ok) return { messagesTotal: 0, threadsTotal: 0 };
  const json = await res.json();
  return {
    messagesTotal: Number(json.messagesTotal ?? 0),
    threadsTotal: Number(json.threadsTotal ?? 0),
  };
}

async function gmailListMessageIds(
  accessToken: string,
  query: string,
  maxResults = SCAN_LIST_MAX,
): Promise<{ ids: string[]; capped: boolean }> {
  const ids: string[] = [];
  let pageToken = '';

  while (ids.length < maxResults) {
    const url = new URL(`${GMAIL_API_BASE}/messages`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', String(Math.min(100, maxResults - ids.length)));
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), { headers: buildAuthHeaders(accessToken) });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Gmail list failed (${res.status}): ${txt}`);
    }
    const json = await res.json();
    const messages = Array.isArray(json.messages) ? json.messages : [];
    for (const m of messages) {
      const id = typeof m?.id === 'string' ? m.id : '';
      if (id) ids.push(id);
      if (ids.length >= maxResults) break;
    }
    const next = typeof json.nextPageToken === 'string' ? json.nextPageToken : '';
    if (!next || ids.length >= maxResults) {
      return { ids, capped: Boolean(next) };
    }
    pageToken = next;
  }

  return { ids, capped: false };
}

async function gmailGetMessageSize(accessToken: string, id: string): Promise<number> {
  const url = `${GMAIL_API_BASE}/messages/${id}?format=minimal`;
  const res = await fetch(url, { headers: buildAuthHeaders(accessToken) });
  if (!res.ok) return 0;
  const json = await res.json();
  return Number(json.sizeEstimate ?? 0);
}

async function sizeMessages(accessToken: string, ids: string[]): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  for (let i = 0; i < ids.length; i += SIZE_BATCH) {
    const batch = ids.slice(i, i + SIZE_BATCH);
    const results = await Promise.all(
      batch.map(async (id) => ({ id, size: await gmailGetMessageSize(accessToken, id) })),
    );
    for (const { id, size } of results) sizes.set(id, size);
  }
  return sizes;
}

async function scanGroupListOnly(
  accessToken: string,
  group: { key: DetoxGroupKey; label: string; query: string },
): Promise<{ key: DetoxGroupKey; label: string; ids: string[]; capped: boolean }> {
  const { ids, capped } = await gmailListMessageIds(accessToken, group.query, SCAN_LIST_MAX);
  return { key: group.key, label: group.label, ids, capped };
}

/** Each message counts toward one category only (highest-priority match). */
function buildAllocatedGroupsFromLists(
  groupResults: Array<{ key: DetoxGroupKey; label: string; ids: string[]; capped: boolean }>,
): { groups: GroupSummary[]; allocatedIds: string[] } {
  const owner = new Map<string, DetoxGroupKey>();

  for (const key of CLEANUP_PRIORITY) {
    const result = groupResults.find((r) => r.key === key);
    if (!result) continue;
    for (const id of result.ids) {
      if (!owner.has(id)) owner.set(id, key);
    }
  }

  const totals = new Map<DetoxGroupKey, { count: number; capped: boolean }>();
  for (const g of GROUPS) totals.set(g.key, { count: 0, capped: false });

  for (const id of owner.keys()) {
    const key = owner.get(id)!;
    totals.get(key)!.count += 1;
  }

  for (const result of groupResults) {
    const t = totals.get(result.key);
    if (t) t.capped = result.capped;
  }

  const groups: GroupSummary[] = GROUPS.map((g) => {
    const t = totals.get(g.key)!;
    return {
      key: g.key,
      label: g.label,
      count: t.count,
      bytes: 0,
      capped: t.capped,
    };
  });

  const orderedIds: string[] = [];
  for (const key of CLEANUP_PRIORITY) {
    const result = groupResults.find((r) => r.key === key);
    if (!result) continue;
    for (const id of result.ids) {
      if (owner.get(id) === key) orderedIds.push(id);
    }
  }

  return { groups, allocatedIds: orderedIds };
}

function pickMessageIds(raw: unknown, max = CLEANUP_BATCH_MAX): string[] {
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const item of raw) {
    const id = String(item ?? '').trim();
    if (!id || ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= max) break;
  }
  return ids;
}

async function estimateBytesFromSample(
  accessToken: string,
  messageIds: string[],
): Promise<number> {
  if (!messageIds.length) return DEFAULT_BYTES_PER_MESSAGE;
  const sampleIds = messageIds.slice(0, SCAN_SIZE_SAMPLE);
  const sampleSizes = await sizeMessages(accessToken, sampleIds);
  if (!sampleSizes.size) return DEFAULT_BYTES_PER_MESSAGE;
  let sum = 0;
  for (const size of sampleSizes.values()) sum += size;
  return Math.max(1024, Math.round(sum / sampleSizes.size));
}

async function collectCleanupCandidates(
  accessToken: string,
  selectedGroups: DetoxGroupKey[],
  maxCandidates = CLEANUP_BATCH_MAX,
): Promise<string[]> {
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const key of CLEANUP_PRIORITY) {
    if (!selectedGroups.includes(key)) continue;
    if (ordered.length >= maxCandidates) break;

    const group = GROUPS.find((g) => g.key === key);
    if (!group) continue;

    const need = maxCandidates - ordered.length;
    const { ids } = await gmailListMessageIds(accessToken, group.query, need);
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
      if (ordered.length >= maxCandidates) break;
    }
  }

  return ordered;
}

async function previewNextBatch(
  accessToken: string,
  selectedGroups: DetoxGroupKey[],
  messageIds: string[] = [],
): Promise<BatchPreview> {
  const batchIds = messageIds.length
    ? messageIds.slice(0, CLEANUP_BATCH_MAX)
    : await collectCleanupCandidates(accessToken, selectedGroups, CLEANUP_BATCH_MAX);
  if (!batchIds.length) {
    return { batchCount: 0, batchBytes: 0, remainingCount: 0 };
  }

  const batchSizes = await sizeMessages(accessToken, batchIds);
  let batchBytes = 0;
  for (const size of batchSizes.values()) batchBytes += size;

  return {
    batchCount: batchIds.length,
    batchBytes,
    remainingCount: 0,
  };
}

async function scanMailbox(accessToken: string): Promise<{
  totalBytes: number;
  totalMessages: number;
  groups: GroupSummary[];
  mailboxMessagesTotal: number;
  nextBatch: BatchPreview;
  deleteCandidateIds: string[];
}> {
  const [profile, ...groupResults] = await Promise.all([
    gmailGetProfile(accessToken),
    ...GROUPS.map((group) => scanGroupListOnly(accessToken, group)),
  ]);

  const { groups, allocatedIds } = buildAllocatedGroupsFromLists(groupResults);
  const totalMessages = allocatedIds.length;
  const avgBytes = await estimateBytesFromSample(accessToken, allocatedIds);
  const totalBytes = totalMessages * avgBytes;

  for (const g of groups) {
    g.bytes = g.count * avgBytes;
  }

  const batchCount = Math.min(CLEANUP_BATCH_MAX, totalMessages);
  const nextBatch: BatchPreview = {
    batchCount,
    batchBytes: batchCount * avgBytes,
    remainingCount: Math.max(0, totalMessages - batchCount),
  };

  return {
    totalBytes,
    totalMessages,
    groups,
    mailboxMessagesTotal: profile.messagesTotal,
    nextBatch,
    deleteCandidateIds: allocatedIds.slice(0, CLEANUP_BATCH_MAX),
  };
}

async function batchDelete(accessToken: string, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  let removed = 0;
  for (const id of ids) {
    const res = await fetch(`${GMAIL_API_BASE}/messages/${id}/trash`, {
      method: 'POST',
      headers: buildAuthHeaders(accessToken),
    });
    if (res.ok) {
      removed += 1;
      continue;
    }
    const txt = await res.text();
    if (res.status === 403 && /insufficient authentication scopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(txt)) {
      throw new Error(
        'GMAIL_MODIFY_REQUIRED: Allow “Read, compose, and send emails” on the Google permission screen.',
      );
    }
  }
  if (removed > 0) return removed;

  const res = await fetch(`${GMAIL_API_BASE}/messages/batchDelete`, {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 403 && /insufficient authentication scopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(txt)) {
      throw new Error(
        'GMAIL_MODIFY_REQUIRED: Allow “Read, compose, and send emails” on the Google permission screen.',
      );
    }
    throw new Error(`Gmail delete failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  return ids.length;
}

async function cleanupMailbox(
  accessToken: string,
  selectedGroups: DetoxGroupKey[],
  messageIds: string[] = [],
): Promise<{
  deletedCount: number;
  deletedBytes: number;
  remainingCount: number;
  batchLimit: number;
  nextBatch: BatchPreview;
}> {
  let batchIds = messageIds.slice(0, CLEANUP_BATCH_MAX);
  if (!batchIds.length) {
    batchIds = await collectCleanupCandidates(accessToken, selectedGroups, CLEANUP_BATCH_MAX);
  }

  let deletedBytes = 0;
  let deletedCount = 0;
  if (batchIds.length) {
    const batchSizes = await sizeMessages(accessToken, batchIds);
    for (const size of batchSizes.values()) deletedBytes += size;
    deletedCount = await batchDelete(accessToken, batchIds);
  }

  return {
    deletedCount,
    deletedBytes,
    remainingCount: 0,
    batchLimit: CLEANUP_BATCH_MAX,
    nextBatch: { batchCount: 0, batchBytes: 0, remainingCount: 0 },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userClient = getSupabaseUser(req);
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? 'scan');
    const { accessToken, scopes } = await getGoogleTokensForUser(user.id);

    if (action === 'verify_oauth') {
      const { clientId, clientSecret } = readGoogleOAuthEnv();
      const probe = await probeGoogleOAuthCredentials(clientId, clientSecret);
      const report = googleOAuthConfigReport(clientId);
      return jsonResponse({
        ok: probe.ok,
        googleAcceptsClient: probe.ok,
        probeReason: probe.ok ? 'invalid_grant (expected)' : (probe as { reason: string }).reason,
        ...report,
        hint: !probe.ok
          ? (probe as { reason: string }).reason === 'invalid_client'
            ? 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in Supabase does not match Google Cloud Web client photodumps-supabase-web'
            : `Google probe failed: ${(probe as { reason: string }).reason}`
          : 'Credentials accepted by Google',
      });
    }

    if (action === 'scan') {
      const scan = await scanMailbox(accessToken);
      const canDelete = await resolveCanDelete(accessToken, scopes);
      return jsonResponse({
        ok: true,
        totalBytes: scan.totalBytes,
        totalMessages: scan.totalMessages,
        groups: scan.groups,
        mailboxMessagesTotal: scan.mailboxMessagesTotal,
        nextBatch: scan.nextBatch,
        scanDepthPerGroup: SCAN_LIST_MAX,
        cleanupBatchMax: CLEANUP_BATCH_MAX,
        canDelete,
        deleteCandidateIds: scan.deleteCandidateIds,
      });
    }

    if (action === 'preview_batch') {
      const raw = Array.isArray(body.groups) ? body.groups : [];
      const allowed = new Set<DetoxGroupKey>(GROUPS.map((g) => g.key));
      const selectedGroups = raw
        .map((x) => String(x) as DetoxGroupKey)
        .filter((x) => allowed.has(x));
      if (!selectedGroups.length) {
        return jsonResponse({ error: 'No valid groups selected.' }, 400);
      }
      const messageIds = pickMessageIds(body.messageIds);
      const preview = await previewNextBatch(accessToken, selectedGroups, messageIds);
      return jsonResponse({ ok: true, ...preview, batchLimit: CLEANUP_BATCH_MAX });
    }

    if (action === 'cleanup') {
      const canDelete = await resolveCanDelete(accessToken, scopes);
      if (!canDelete) {
        return jsonResponse(
          { error: 'GMAIL_MODIFY_REQUIRED: Allow “Read, compose, and send emails” on the Google permission screen.' },
          403,
        );
      }

      const raw = Array.isArray(body.groups) ? body.groups : [];
      const allowed = new Set<DetoxGroupKey>(GROUPS.map((g) => g.key));
      const selectedGroups = raw
        .map((x) => String(x) as DetoxGroupKey)
        .filter((x) => allowed.has(x));
      if (!selectedGroups.length && !pickMessageIds(body.messageIds).length) {
        return jsonResponse({ error: 'No valid groups selected for cleanup.' }, 400);
      }

      const messageIds = pickMessageIds(body.messageIds);
      const result = await cleanupMailbox(accessToken, selectedGroups, messageIds);
      return jsonResponse({
        ok: true,
        deletedCount: result.deletedCount,
        deletedBytes: result.deletedBytes,
        remainingCount: result.remainingCount,
        batchLimit: result.batchLimit,
        nextBatch: result.nextBatch,
      });
    }

    return jsonResponse({ error: 'Unsupported action. Use scan, preview_batch, or cleanup.' }, 400);
  } catch (e) {
    console.error('[gmail-detox]', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
