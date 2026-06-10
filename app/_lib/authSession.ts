import type { Session } from '@supabase/supabase-js';

function providerList(session: Session): string[] {
  const fromIdentities = (session.user.identities ?? []).map(id => id.provider);
  const primary = session.user.app_metadata?.provider;
  const many = session.user.app_metadata?.providers;
  const list = [...fromIdentities];
  if (typeof primary === 'string') list.push(primary);
  if (Array.isArray(many)) list.push(...many.filter((p): p is string => typeof p === 'string'));
  return list;
}

/** True when the user signed in via Apple or Google OAuth (immediate access). */
export function isOAuthSession(session: Session): boolean {
  return providerList(session).some(p => p === 'google' || p === 'apple');
}

export function authProviderLabel(session: Session): string {
  const provider = session.user.app_metadata?.provider as string | undefined;
  return provider ?? 'email';
}

/** Email verification links — not OAuth sign-in. */
export function isEmailVerificationCallback(params: Record<string, string>): boolean {
  const type = (params.type ?? '').toLowerCase();
  return type === 'signup' || type === 'email' || type === 'email_change' || type === 'invite';
}

/** After PKCE exchange, treat as OAuth when federated providers are present (not email-only). */
export function isFederatedAuthSession(session: Session): boolean {
  if (isOAuthSession(session)) return true;
  const identities = session.user.identities ?? [];
  if (identities.length === 0) return true;
  return identities.some(id => id.provider === 'google' || id.provider === 'apple');
}
