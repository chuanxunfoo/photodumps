import { Linking, Platform } from 'react-native';
import { isExpoGo } from './stickerStudio/runtime';

export const SUPPORT_INSTAGRAM_USER = 'photodumps.app';
export const SUPPORT_EMAIL = 'photodumps.support@gmail.com';

function gmailComposeQuery() {
  return new URLSearchParams({ to: SUPPORT_EMAIL }).toString();
}

function mailtoUrl() {
  return `mailto:${SUPPORT_EMAIL}`;
}

/** Gmail app compose — recipient only (no subject/body). */
function gmailAppUrls(): string[] {
  const q = gmailComposeQuery();
  return [`googlegmail:///co?${q}`, `googlegmail://co?${q}`];
}

/** Android: open Gmail package directly on the compose screen. */
function gmailAndroidIntentUrl() {
  const q = gmailComposeQuery();
  return (
    `intent://send?${q}#Intent;` +
    'scheme=mailto;' +
    'package=com.google.android.gm;' +
    'action=android.intent.action.SENDTO;' +
    'end'
  );
}

async function openUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

async function tryOpen(url: string, opts?: { requireCanOpen?: boolean }) {
  if (opts?.requireCanOpen !== false) {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) return false;
    } catch {
      return false;
    }
  }
  return openUrl(url);
}

/** Open Instagram profile / DM entry for @photodumps.app */
export async function openInstagramSupport() {
  const user = SUPPORT_INSTAGRAM_USER;
  const candidates = [
    `instagram://user?username=${user}`,
    Platform.OS === 'ios'
      ? `instagram://user?username=${user}`
      : `instagram://www.instagram.com/_u/${user}`,
    `https://www.instagram.com/${user}/`,
  ];
  for (const url of candidates) {
    if (await tryOpen(url)) return;
  }
  await Linking.openURL(`https://www.instagram.com/${user}/`);
}

/** Open Gmail (or mail app) compose with only the support address pre-filled. */
export async function openEmailSupport() {
  if (isExpoGo()) {
    if (await tryOpen(mailtoUrl())) return;
    await Linking.openURL(mailtoUrl());
    return;
  }

  if (Platform.OS === 'android') {
    if (await tryOpen(gmailAndroidIntentUrl(), { requireCanOpen: false })) return;
    for (const url of gmailAppUrls()) {
      if (await tryOpen(url, { requireCanOpen: false })) return;
    }
  } else {
    for (const url of gmailAppUrls()) {
      if (await tryOpen(url)) return;
    }
  }

  if (await tryOpen(mailtoUrl())) return;
  await Linking.openURL(mailtoUrl());
}
