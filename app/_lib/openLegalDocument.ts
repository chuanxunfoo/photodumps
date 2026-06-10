import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { hubPush, type HubPage } from './exploreBack';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from './legalUrls';

/** Full legal text in-app — always works (paywall, settings, hub). */
export function openTermsDocument(fromHub?: HubPage) {
  if (fromHub) {
    hubPush('/explore-legal-terms', fromHub);
    return;
  }
  router.push('/explore-legal-terms');
}

export function openPrivacyDocument(fromHub?: HubPage) {
  if (fromHub) {
    hubPush('/explore-legal-privacy', fromHub);
    return;
  }
  router.push('/explore-legal-privacy');
}

/** Public URLs for App Store metadata and optional web mirror. */
export async function openTermsOnWeb() {
  await WebBrowser.openBrowserAsync(TERMS_OF_SERVICE_URL);
}

export async function openPrivacyOnWeb() {
  await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
}
