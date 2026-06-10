import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const READY_PREFIX = '@gmail_detox_ready/v2:';
const OAUTH_RETURN_KEY = '@gmail_oauth_return/v1';
const OAUTH_REDIRECT_AT_KEY = '@gmail_oauth_redirect_at';
const AFTER_OAUTH_KEY = '@gmail_detox_after_oauth';
const EXCHANGED_CODE_KEY = '@gmail_oauth_exchanged_code/v1';

export type GmailPendingAction = 'scan' | 'clean';

export type GmailOAuthReturnPayload = {
  hasModify: boolean;
  pending: GmailPendingAction;
};

function readyKey(userId: string): string {
  return `${READY_PREFIX}${userId}`;
}

export async function markGmailDetoxReady(userId: string): Promise<void> {
  if (!userId) return;
  await AsyncStorage.setItem(readyKey(userId), '1');
}

export async function clearGmailDetoxReady(userId: string): Promise<void> {
  if (!userId) return;
  await AsyncStorage.removeItem(readyKey(userId));
}

/** True after we verified delete-capable Gmail access. */
export async function isGmailDetoxReady(userId: string): Promise<boolean> {
  if (!userId) return false;
  const cached = await AsyncStorage.getItem(readyKey(userId));
  return cached === '1';
}

async function writeOAuthJson(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function readOAuthJson(key: string): Promise<string | null> {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function removeOAuthJson(key: string): Promise<void> {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

export async function stashGmailOAuthReturn(payload: GmailOAuthReturnPayload): Promise<void> {
  await writeOAuthJson(
    OAUTH_RETURN_KEY,
    JSON.stringify({ ...payload, at: Date.now() }),
  );
}

/** One-time payload after Google redirects back — prevents OAuth loops. */
export async function consumeGmailOAuthReturn(): Promise<GmailOAuthReturnPayload | null> {
  const raw = await readOAuthJson(OAUTH_RETURN_KEY);
  await removeOAuthJson(OAUTH_RETURN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GmailOAuthReturnPayload & { at?: number };
    if (parsed.at && Date.now() - parsed.at > 10 * 60_000) return null;
    return {
      hasModify: Boolean(parsed.hasModify),
      pending: parsed.pending === 'clean' ? 'clean' : 'scan',
    };
  } catch {
    return null;
  }
}

export async function markGmailPendingAction(action: GmailPendingAction): Promise<void> {
  await writeOAuthJson('gmail_detox_pending_action', action);
}

export async function markGmailOAuthResume(action: GmailPendingAction | 'rescan'): Promise<void> {
  await writeOAuthJson(AFTER_OAUTH_KEY, action);
}

export async function consumeGmailOAuthResume(): Promise<GmailPendingAction | 'rescan' | null> {
  const v = await readOAuthJson(AFTER_OAUTH_KEY);
  await removeOAuthJson(AFTER_OAUTH_KEY);
  if (v === 'scan' || v === 'clean' || v === 'rescan') return v;
  return null;
}

/** User explicitly asked to connect — allow the permission popup again. */
export async function allowPermissionPromptAgain(): Promise<void> {
  await clearOAuthRedirectMarker();
}

export async function markOAuthRedirectStarted(): Promise<void> {
  await writeOAuthJson(OAUTH_REDIRECT_AT_KEY, String(Date.now()));
}

/** Block auto-opening the permission popup right after an OAuth redirect. */
export async function shouldBlockAutoPermissionPrompt(): Promise<boolean> {
  const at = await readOAuthJson(OAUTH_REDIRECT_AT_KEY);
  if (!at) return false;
  return Date.now() - Number(at) < 90_000;
}

export async function clearOAuthRedirectMarker(): Promise<void> {
  await removeOAuthJson(OAUTH_REDIRECT_AT_KEY);
}

/** Skip exchanging the same Google auth code twice (WebBrowser + deep link). */
export async function markOAuthCodeExchanged(code: string): Promise<void> {
  const trimmed = code.trim();
  if (!trimmed) return;
  await writeOAuthJson(EXCHANGED_CODE_KEY, JSON.stringify({ code: trimmed, at: Date.now() }));
}

export async function wasOAuthCodeExchanged(code: string): Promise<boolean> {
  const raw = await readOAuthJson(EXCHANGED_CODE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { code?: string; at?: number };
    if (!parsed.code || parsed.code !== code.trim()) return false;
    if (parsed.at && Date.now() - parsed.at > 15 * 60_000) return false;
    return true;
  } catch {
    return false;
  }
}
