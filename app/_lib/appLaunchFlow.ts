import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARD_KEY = '@dumpit_onboard';
export const PAYWALL_DONE_KEY = '@dumpit_paywall_done';
export const PERMISSIONS_SETUP_KEY = '@dumpit_permissions_setup_done';
export const OAUTH_BROWSER_ACTIVE_KEY = '@auth_oauth_browser_active';

export async function markOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARD_KEY, 'true');
}

export async function markPaywallComplete(): Promise<void> {
  await AsyncStorage.setItem(PAYWALL_DONE_KEY, '1');
}

export async function markPermissionsSetupComplete(): Promise<void> {
  await AsyncStorage.setItem(PERMISSIONS_SETUP_KEY, '1');
}

export async function clearStaleOAuthBrowserFlag(): Promise<void> {
  await AsyncStorage.removeItem(OAUTH_BROWSER_ACTIVE_KEY);
}

/** First-run route after splash — never sends users to /auth. */
export async function resolveLaunchRoute(): Promise<string> {
  await clearStaleOAuthBrowserFlag();

  const onboard = await AsyncStorage.getItem(ONBOARD_KEY);
  if (onboard !== 'true') return '/onboarding';

  const signedOnce = (await AsyncStorage.getItem('@dumpit_signed_once')) === '1';

  let paywallDone = await AsyncStorage.getItem(PAYWALL_DONE_KEY);
  if (paywallDone !== '1' && signedOnce) {
    await markPaywallComplete();
    paywallDone = '1';
  }
  if (paywallDone !== '1') return '/subscription?postOnboarding=1';

  // Photo permission prompts are user-initiated only (calendar banner) — never on launch.
  return '/hub?page=calendar';
}
