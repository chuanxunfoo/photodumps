import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { isEmailVerificationCallback, isFederatedAuthSession } from './authSession';
import { safeReplace } from './safeNavigate';
import type { UserProfile } from '../(tabs)/ThemeContext';
import { useTheme } from '../(tabs)/ThemeContext';
import { supabase } from '../(tabs)/supabase';

/** OAuth + Stripe return URLs — must live under the single root ThemeProvider. */
export function DeepLinkHandler() {
  const { setUser, refreshPlanFromSupabase } = useTheme();

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) void handleURL(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => void handleURL(url));
    return () => sub.remove();
  }, []);

  const handleURL = async (url: string) => {
    if (!url) return;
    if (url.includes('stripe-return')) {
      const { parseStripeReturnUrl, verifyCheckoutSession } = await import('./stripe/checkout');
      const { sessionId, cancelled } = parseStripeReturnUrl(url);
      if (!cancelled && sessionId) {
        await verifyCheckoutSession(sessionId);
        await refreshPlanFromSupabase();
      }
      return;
    }
    await handleAuthURL(url);
  };

  const handleAuthURL = async (url: string) => {
    if (!url || !url.includes('auth-callback')) return;
    const {
      createSessionFromUrl,
      finalizeOAuthSession,
      isOAuthBrowserSessionActive,
      parseOAuthRedirectParams,
    } = await import('../(tabs)/authOAuth');
    if (await isOAuthBrowserSessionActive()) return;
    try {
      const params = parseOAuthRedirectParams(url);
      if (params.error) return;

      if (params.type === 'recovery') {
        const session = await createSessionFromUrl(url);
        if (!session) {
          safeReplace('/hub?page=generals');
          return;
        }
        const u = session.user;
        const meta = u.user_metadata as { username?: string } | undefined;
        await setUser({
          uid: u.id,
          email: u.email ?? '',
          username: meta?.username ?? u.email?.split('@')[0] ?? 'user',
          isLoggedIn: true,
        });
        safeReplace('/reset-password');
        return;
      }

      const session = await createSessionFromUrl(url);
      if (!session) return;

      if (isFederatedAuthSession(session)) {
        await finalizeOAuthSession(session);
        const u = session.user;
        const meta = u.user_metadata as { username?: string; full_name?: string } | undefined;
        const profile: UserProfile = {
          uid: u.id,
          email: u.email ?? '',
          username:
            (typeof meta?.username === 'string' && meta.username) ||
            (typeof meta?.full_name === 'string' && meta.full_name.split(' ')[0]) ||
            u.email?.split('@')[0] ||
            'user',
          isLoggedIn: true,
        };
        await setUser(profile);
        safeReplace('/hub?page=generals');
        return;
      }

      if (isEmailVerificationCallback(params)) {
        await supabase.auth.signOut();
        return;
      }

      await finalizeOAuthSession(session);
      const u = session.user;
      const meta = u.user_metadata as { username?: string } | undefined;
      await setUser({
        uid: u.id,
        email: u.email ?? '',
        username: meta?.username ?? u.email?.split('@')[0] ?? 'user',
        isLoggedIn: true,
      });
      safeReplace('/hub?page=generals');
    } catch (e) {
      console.warn('Deep link auth error:', e);
    }
  };

  return null;
}
