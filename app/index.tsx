import { Redirect } from 'expo-router';

/**
 * Resolves bare `/` and dev URLs ending in `/--/` so the app never opens on “Unmatched route”.
 * Post-splash routing still runs from `app/_layout.tsx` (onboarding / auth / calendar).
 */
export default function RootIndex() {
  return <Redirect href="/calendar" />;
}
