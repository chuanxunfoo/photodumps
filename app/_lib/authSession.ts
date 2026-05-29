import type { Session } from '@supabase/supabase-js';

/** True when the user signed in via Apple or Google OAuth (immediate access). */
export function isOAuthSession(session: Session): boolean {
  const provider = session.user.app_metadata?.provider as string | undefined;
  if (provider === 'google' || provider === 'apple') return true;
  return (session.user.identities ?? []).some(
    (id) => id.provider === 'google' || id.provider === 'apple',
  );
}

export function authProviderLabel(session: Session): string {
  const provider = session.user.app_metadata?.provider as string | undefined;
  return provider ?? 'email';
}
