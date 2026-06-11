import Constants from 'expo-constants';

/** Must match Xcode bundle ID and Supabase Apple provider Client IDs. */
export const IOS_APP_BUNDLE_ID =
  Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.yourname.dumpitapp';

export const SUPABASE_APPLE_SETUP_HINT =
  `In Supabase → Authentication → Providers → Apple: enable Apple, then add Client ID "${IOS_APP_BUNDLE_ID}" (your iOS bundle ID). Native Sign in with Apple does not use the web OAuth redirect.`;
