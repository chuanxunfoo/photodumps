import { supabase } from '../(tabs)/supabase';

export type DetoxGroupKey =
  | 'promo_ads'
  | 'spam_phishing'
  | 'newsletter'
  | 'social_digest'
  | 'stale_threads'
  | 'attachments_large'
  | 'old_messages';

/** Matches server CLEANUP_BATCH_MAX — small batches per run. */
export const GMAIL_DETOX_BATCH_SIZE = 6;

export type GmailDetoxGroup = {
  key: DetoxGroupKey;
  label: string;
  count: number;
  bytes: number;
  capped?: boolean;
};

export type GmailDetoxBatchPreview = {
  batchCount: number;
  batchBytes: number;
  remainingCount: number;
};

type ScanResponse =
  | {
      ok: true;
      totalBytes: number;
      totalMessages: number;
      groups: GmailDetoxGroup[];
      mailboxMessagesTotal?: number;
      nextBatch?: GmailDetoxBatchPreview;
      scanDepthPerGroup?: number;
      cleanupBatchMax?: number;
      canDelete?: boolean;
      deleteCandidateIds?: string[];
    }
  | { ok?: false; error?: string };

type CleanupResponse =
  | {
      ok: true;
      deletedCount: number;
      deletedBytes: number;
      remainingCount?: number;
      batchLimit?: number;
      nextBatch?: GmailDetoxBatchPreview;
    }
  | { ok?: false; error?: string };

type PreviewResponse =
  | { ok: true; batchCount: number; batchBytes: number; remainingCount: number; batchLimit?: number }
  | { ok?: false; error?: string };

async function formatInvokeError(error: { message?: string; context?: Response }): Promise<string> {
  const msg = error.message ?? 'Request failed';
  const status = error.context?.status;
  if (status === 401) return 'Session expired. Please sign in again.';
  if (status === 404) return 'gmail-detox function is not deployed yet. Deploy it with: npx supabase functions deploy gmail-detox';
  if (status === 504 || status === 546) {
    return 'Gmail scan timed out on the server. Try again — a faster scan update may still be deploying.';
  }
  if (/failed to send a request|failed to fetch|network request failed|network error/i.test(msg)) {
    return 'Email Clean server timed out or is unreachable. Wait a few seconds and try Confirm delete again.';
  }
  if (error.context) {
    try {
      const data = (await error.context.json()) as { error?: string };
      if (data?.error) return humanizeGmailError(data.error);
    } catch {
      // Ignore JSON parse issues and fall through to message.
    }
  }
  return humanizeGmailError(msg);
}

function humanizeGmailError(raw: string): string {
  if (/GMAIL_OAUTH_CONFIG|invalid_client|OAuth client was not found/i.test(raw)) {
    return 'Google sign-in is misconfigured on the server. In Supabase → Edge Functions → Secrets, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to match your Google Cloud Web client (photodumps-supabase-web), then connect Gmail again.';
  }
  if (/GMAIL_RECONNECT_REQUIRED|invalid_grant|expired or revoked/i.test(raw)) {
    return 'GMAIL_RECONNECT_REQUIRED';
  }
  if (/insufficient authentication scopes|ACCESS_TOKEN_SCOPE_INSUFFICIENT|delete permission missing|GMAIL_MODIFY_REQUIRED/i.test(raw)) {
    return 'GMAIL_SETUP_REQUIRED';
  }
  if (/Gmail batchDelete failed \(403\)/i.test(raw)) {
    return 'GMAIL_SETUP_REQUIRED';
  }
  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}

function parseBatchPreview(payload: {
  batchCount?: number;
  batchBytes?: number;
  remainingCount?: number;
}): GmailDetoxBatchPreview {
  return {
    batchCount: Number(payload.batchCount ?? 0),
    batchBytes: Number(payload.batchBytes ?? 0),
    remainingCount: Number(payload.remainingCount ?? 0),
  };
}

const SCAN_TIMEOUT_MS = 90_000;
const PREVIEW_TIMEOUT_MS = 45_000;
const CLEANUP_TIMEOUT_MS = 90_000;

export async function scanGmailDetox(): Promise<{
  ok: true;
  totalBytes: number;
  totalMessages: number;
  groups: GmailDetoxGroup[];
  mailboxMessagesTotal: number;
  scanDepthPerGroup: number;
  cleanupBatchMax: number;
  nextBatch: GmailDetoxBatchPreview;
  canDelete: boolean;
  deleteCandidateIds: string[];
} | {
  ok: false;
  error: string;
}> {
  const timeout = new Promise<{ ok: false; error: string }>((resolve) => {
    setTimeout(
      () => resolve({ ok: false, error: 'Gmail scan timed out. Try again — if this keeps happening, your inbox may be very large.' }),
      SCAN_TIMEOUT_MS,
    );
  });

  const scan = (async () => {
    const { data, error } = await supabase.functions.invoke('gmail-detox', {
      body: { action: 'scan' },
    });
    if (error) return { ok: false as const, error: await formatInvokeError(error as { message?: string; context?: Response }) };
    const payload = (data ?? {}) as ScanResponse;
    if (!payload.ok) return { ok: false as const, error: payload.error ?? 'Scan failed.' };
    return {
      ok: true as const,
      totalBytes: Number(payload.totalBytes ?? 0),
      totalMessages: Number(payload.totalMessages ?? 0),
      groups: Array.isArray(payload.groups) ? payload.groups : [],
      mailboxMessagesTotal: Number(payload.mailboxMessagesTotal ?? 0),
      scanDepthPerGroup: Number(payload.scanDepthPerGroup ?? 40),
      cleanupBatchMax: Number(payload.cleanupBatchMax ?? GMAIL_DETOX_BATCH_SIZE),
      nextBatch: parseBatchPreview(payload.nextBatch ?? {}),
      canDelete: Boolean(payload.canDelete),
      deleteCandidateIds: Array.isArray(payload.deleteCandidateIds)
        ? payload.deleteCandidateIds.filter((id): id is string => typeof id === 'string' && Boolean(id))
        : [],
    };
  })();

  return Promise.race([scan, timeout]);
}

export async function previewGmailDetoxBatch(
  groups: DetoxGroupKey[],
  messageIds: string[] = [],
): Promise<{
  ok: true;
  batchCount: number;
  batchBytes: number;
  remainingCount: number;
  batchLimit: number;
} | {
  ok: false;
  error: string;
}> {
  const timeout = new Promise<{ ok: false; error: string }>((resolve) => {
    setTimeout(() => resolve({ ok: false, error: 'Could not load batch preview. Try again.' }), PREVIEW_TIMEOUT_MS);
  });

  const preview = (async () => {
    const { data, error } = await supabase.functions.invoke('gmail-detox', {
      body: { action: 'preview_batch', groups, messageIds },
    });
    if (error) return { ok: false as const, error: await formatInvokeError(error as { message?: string; context?: Response }) };
    const payload = (data ?? {}) as PreviewResponse;
    if (!payload.ok) return { ok: false as const, error: payload.error ?? 'Preview failed.' };
    return {
      ok: true as const,
      batchCount: Number(payload.batchCount ?? 0),
      batchBytes: Number(payload.batchBytes ?? 0),
      remainingCount: Number(payload.remainingCount ?? 0),
      batchLimit: Number(payload.batchLimit ?? GMAIL_DETOX_BATCH_SIZE),
    };
  })();

  return Promise.race([preview, timeout]);
}

export async function cleanupGmailDetox(
  groups: DetoxGroupKey[],
  messageIds: string[] = [],
): Promise<{
  ok: true;
  deletedCount: number;
  deletedBytes: number;
  remainingCount: number;
  batchLimit: number;
  nextBatch: GmailDetoxBatchPreview;
} | {
  ok: false;
  error: string;
}> {
  const timeout = new Promise<{ ok: false; error: string }>((resolve) => {
    setTimeout(
      () => resolve({ ok: false, error: 'Delete timed out. Your emails may still have been removed — tap Scan to refresh.' }),
      CLEANUP_TIMEOUT_MS,
    );
  });

  const cleanup = (async () => {
    const { data, error } = await supabase.functions.invoke('gmail-detox', {
      body: { action: 'cleanup', groups, messageIds },
    });
    if (error) return { ok: false as const, error: await formatInvokeError(error as { message?: string; context?: Response }) };
    const payload = (data ?? {}) as CleanupResponse;
    if (!payload.ok) return { ok: false as const, error: payload.error ?? 'Cleanup failed.' };
    return {
      ok: true as const,
      deletedCount: Number(payload.deletedCount ?? 0),
      deletedBytes: Number(payload.deletedBytes ?? 0),
      remainingCount: Number(payload.remainingCount ?? 0),
      batchLimit: Number(payload.batchLimit ?? GMAIL_DETOX_BATCH_SIZE),
      nextBatch: parseBatchPreview(payload.nextBatch ?? { remainingCount: payload.remainingCount }),
    };
  })();

  return Promise.race([cleanup, timeout]);
}
