import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
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

async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in Supabase Edge Function secrets.',
    );
  }

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
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const accessToken = String(json.access_token ?? '');
  if (!accessToken) throw new Error('Google token refresh returned no access_token.');
  return accessToken;
}

async function getGoogleTokensForUser(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('gmail_oauth_tokens')
    .select('provider_token, provider_refresh_token, updated_at')
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

  const accessToken = await refreshGoogleAccessToken(refreshToken);
  return { accessToken, refreshToken };
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

async function scanGroup(
  accessToken: string,
  group: { key: DetoxGroupKey; label: string; query: string },
): Promise<{ summary: GroupSummary; sizes: Map<string, number>; capped: boolean }> {
  const { ids, capped } = await gmailListMessageIds(accessToken, group.query, SCAN_LIST_MAX);
  const sizeMap = await sizeMessages(accessToken, ids);
  let bytes = 0;
  for (const size of sizeMap.values()) bytes += size;

  return {
    summary: {
      key: group.key,
      label: group.label,
      count: ids.length,
      bytes,
      capped,
    },
    sizes: sizeMap,
    capped,
  };
}

/** Each message counts toward one category only (highest-priority match). */
function buildAllocatedGroups(
  groupResults: Array<{ summary: GroupSummary; sizes: Map<string, number>; capped: boolean }>,
): { groups: GroupSummary[]; uniqueSizes: Map<string, number> } {
  const uniqueSizes = new Map<string, number>();
  const owner = new Map<string, DetoxGroupKey>();

  for (const result of groupResults) {
    for (const [id, size] of result.sizes) {
      if (!uniqueSizes.has(id)) uniqueSizes.set(id, size);
    }
  }

  for (const key of CLEANUP_PRIORITY) {
    const result = groupResults.find((r) => r.summary.key === key);
    if (!result) continue;
    for (const id of result.sizes.keys()) {
      if (!owner.has(id)) owner.set(id, key);
    }
  }

  const totals = new Map<DetoxGroupKey, { count: number; bytes: number; capped: boolean }>();
  for (const g of GROUPS) totals.set(g.key, { count: 0, bytes: 0, capped: false });

  for (const [id, size] of uniqueSizes) {
    const key = owner.get(id);
    if (!key) continue;
    const t = totals.get(key)!;
    t.count += 1;
    t.bytes += size;
  }

  for (const result of groupResults) {
    const t = totals.get(result.summary.key);
    if (t) t.capped = result.capped;
  }

  const groups: GroupSummary[] = GROUPS.map((g) => {
    const t = totals.get(g.key)!;
    return {
      key: g.key,
      label: g.label,
      count: t.count,
      bytes: t.bytes,
      capped: t.capped,
    };
  });

  return { groups, uniqueSizes };
}

async function collectCleanupCandidates(
  accessToken: string,
  selectedGroups: DetoxGroupKey[],
): Promise<string[]> {
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const key of CLEANUP_PRIORITY) {
    if (!selectedGroups.includes(key)) continue;
    const group = GROUPS.find((g) => g.key === key);
    if (!group) continue;
    const { ids } = await gmailListMessageIds(accessToken, group.query, SCAN_LIST_MAX);
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
  }

  return ordered;
}

async function previewNextBatch(
  accessToken: string,
  selectedGroups: DetoxGroupKey[],
): Promise<BatchPreview> {
  const candidates = await collectCleanupCandidates(accessToken, selectedGroups);
  const batchIds = candidates.slice(0, CLEANUP_BATCH_MAX);
  const batchSizes = await sizeMessages(accessToken, batchIds);
  let batchBytes = 0;
  for (const size of batchSizes.values()) batchBytes += size;

  return {
    batchCount: batchIds.length,
    batchBytes,
    remainingCount: Math.max(0, candidates.length - batchIds.length),
  };
}

async function scanMailbox(accessToken: string): Promise<{
  totalBytes: number;
  totalMessages: number;
  groups: GroupSummary[];
  mailboxMessagesTotal: number;
  nextBatch: BatchPreview;
}> {
  const [profile, ...groupResults] = await Promise.all([
    gmailGetProfile(accessToken),
    ...GROUPS.map((group) => scanGroup(accessToken, group)),
  ]);

  const { groups, uniqueSizes } = buildAllocatedGroups(groupResults);

  let totalBytes = 0;
  for (const size of uniqueSizes.values()) totalBytes += size;

  const selectedKeys = groups.filter((g) => g.count > 0).map((g) => g.key);
  const nextBatch = selectedKeys.length
    ? await previewNextBatch(accessToken, selectedKeys)
    : { batchCount: 0, batchBytes: 0, remainingCount: 0 };

  return {
    totalBytes,
    totalMessages: uniqueSizes.size,
    groups,
    mailboxMessagesTotal: profile.messagesTotal,
    nextBatch,
  };
}

async function batchDelete(accessToken: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const res = await fetch(`${GMAIL_API_BASE}/messages/batchDelete`, {
    method: 'POST',
    headers: buildAuthHeaders(accessToken),
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 403 && /insufficient authentication scopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT/i.test(txt)) {
      throw new Error(
        'GMAIL_MODIFY_REQUIRED: Approve “Manage your mail” on the one-time Google permission screen.',
      );
    }
    throw new Error(`Gmail batchDelete failed (${res.status}): ${txt}`);
  }
}

async function cleanupMailbox(accessToken: string, selectedGroups: DetoxGroupKey[]): Promise<{
  deletedCount: number;
  deletedBytes: number;
  remainingCount: number;
  batchLimit: number;
  nextBatch: BatchPreview;
}> {
  const candidates = await collectCleanupCandidates(accessToken, selectedGroups);
  const batchIds = candidates.slice(0, CLEANUP_BATCH_MAX);
  const remainingIds = candidates.slice(CLEANUP_BATCH_MAX);

  const batchSizes = await sizeMessages(accessToken, batchIds);
  let deletedBytes = 0;
  for (const size of batchSizes.values()) deletedBytes += size;

  if (batchIds.length) {
    await batchDelete(accessToken, batchIds);
  }

  const nextBatch = remainingIds.length
    ? await previewNextBatch(accessToken, selectedGroups)
    : { batchCount: 0, batchBytes: 0, remainingCount: 0 };

  return {
    deletedCount: batchIds.length,
    deletedBytes,
    remainingCount: remainingIds.length,
    batchLimit: CLEANUP_BATCH_MAX,
    nextBatch,
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
    const { accessToken } = await getGoogleTokensForUser(user.id);

    if (action === 'scan') {
      const scan = await scanMailbox(accessToken);
      const canDelete = await accessTokenCanDelete(accessToken);
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
      const preview = await previewNextBatch(accessToken, selectedGroups);
      return jsonResponse({ ok: true, ...preview, batchLimit: CLEANUP_BATCH_MAX });
    }

    if (action === 'cleanup') {
      const canDelete = await accessTokenCanDelete(accessToken);
      if (!canDelete) {
        return jsonResponse(
          { error: 'GMAIL_MODIFY_REQUIRED: Approve “Manage your mail” on the one-time Google permission screen.' },
          403,
        );
      }

      const raw = Array.isArray(body.groups) ? body.groups : [];
      const allowed = new Set<DetoxGroupKey>(GROUPS.map((g) => g.key));
      const selectedGroups = raw
        .map((x) => String(x) as DetoxGroupKey)
        .filter((x) => allowed.has(x));
      if (!selectedGroups.length) {
        return jsonResponse({ error: 'No valid groups selected for cleanup.' }, 400);
      }

      const result = await cleanupMailbox(accessToken, selectedGroups);
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
