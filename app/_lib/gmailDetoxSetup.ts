import AsyncStorage from '@react-native-async-storage/async-storage';

const READY_PREFIX = '@gmail_detox_ready/v2:';
const OAUTH_RETURN_KEY = 'gmail_oauth_return_v1';
const OAUTH_REDIRECT_AT_KEY = 'gmail_oauth_redirect_at';

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

/** True only after we verified delete access (OAuth or scan). */
export async function isGmailDetoxReady(userId: string): Promise<boolean> {
  if (!userId) return false;
  const cached = await AsyncStorage.getItem(readyKey(userId));
  return cached === '1';
}

export function stashGmailOAuthReturn(payload: GmailOAuthReturnPayload): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(
    OAUTH_RETURN_KEY,
    JSON.stringify({ ...payload, at: Date.now() }),
  );
}

/** One-time payload after Google redirects back — prevents URL-param OAuth loops. */
export function consumeGmailOAuthReturn(): GmailOAuthReturnPayload | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(OAUTH_RETURN_KEY);
  sessionStorage.removeItem(OAUTH_RETURN_KEY);
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

export function markGmailPendingAction(action: GmailPendingAction): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem('gmail_detox_pending_action', action);
}

/** User explicitly asked to connect — allow the permission popup again. */
export function allowPermissionPromptAgain(): void {
  clearOAuthRedirectMarker();
}

export function markOAuthRedirectStarted(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(OAUTH_REDIRECT_AT_KEY, String(Date.now()));
}

/** Block auto-opening the permission popup right after an OAuth redirect. */
export function shouldBlockAutoPermissionPrompt(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  const at = sessionStorage.getItem(OAUTH_REDIRECT_AT_KEY);
  if (!at) return false;
  return Date.now() - Number(at) < 90_000;
}

export function clearOAuthRedirectMarker(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(OAUTH_REDIRECT_AT_KEY);
}
