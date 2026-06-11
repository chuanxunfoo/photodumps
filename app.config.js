/**
 * Expo config at project root (not inside app/ — that folder is expo-router routes only).
 * Env vars live in app/.env — load explicitly (Expo only auto-reads root .env).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'app', '.env') });

/** Public AdMob app id — must be in the binary or iOS kills the app at launch. */
const ADMOB_IOS_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? 'ca-app-pub-6354540982110974~4388147190';

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const googleIosUrlScheme = googleIosClientId
  ? `com.googleusercontent.apps.${googleIosClientId.replace(/\.apps\.googleusercontent\.com$/i, '')}`
  : null;

module.exports = ({ config }) => ({
  ...config,
  name: 'photodumps',
  slug: 'Dumplt',
  owner: 'chuanxuns-organization',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './app/assets/brand-icon.png',
  userInterfaceStyle: 'dark',
  androidStatusBar: { translucent: true, backgroundColor: '#00000000' },
  splash: {
    image: './app/assets/brand-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    appleTeamId: '75356Q29L5',
    supportsTablet: false,
    bundleIdentifier: 'com.yourname.dumpitapp',
    entitlements: {
      'com.apple.security.application-groups': ['group.com.yourname.dumpitapp.widgets'],
      'com.apple.developer.applesignin': ['Default'],
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      GADApplicationIdentifier: ADMOB_IOS_APP_ID,
      NSUserTrackingUsageDescription:
        'This helps show relevant ads and keep photodumps free.',
      NSCameraUsageDescription:
        'photodumps needs the camera for Photobooth.',
      NSMicrophoneUsageDescription:
        'photodumps needs the microphone when recording video.',
      NSPhotoLibraryUsageDescription:
        'photodumps needs access to your photos to help you clean and organize your library.',
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ['dumpit', ...(googleIosUrlScheme ? [googleIosUrlScheme] : [])],
        },
      ],
      LSApplicationQueriesSchemes: ['dumpit', 'googlegmail', 'instagram', 'mailto'],
      NSPhotoLibraryAddUsageDescription:
        'photodumps saves your photo booth strips to your library when you tap Save.',
    },
  },
  android: {
    edgeToEdgeEnabled: true,
    adaptiveIcon: {
      foregroundImage: './app/assets/brand-icon.png',
      backgroundColor: '#3B5BFC',
    },
    package: 'com.yourname.dumpitapp',
    queries: [
      { package: 'com.google.android.gm' },
      {
        intent: {
          action: 'android.intent.action.SENDTO',
          data: { scheme: 'mailto' },
        },
      },
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'dumpit' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  scheme: 'dumpit',
  plugins: [
    [
      'expo-build-properties',
      {
        ios: { newArchEnabled: true },
        android: { newArchEnabled: true },
      },
    ],
    'expo-router',
    [
      'expo-media-library',
      {
        photosPermission: 'photodumps needs access to your photos to help you clean them up.',
        savePhotosPermission: 'Allow photodumps to save photos.',
        isAccessMediaLocationEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'photodumps needs photo access to import shots into the camera lab.',
      },
    ],
    'react-native-compressor',
    'expo-notifications',
    'expo-apple-authentication',
    '@bacons/apple-targets',
    [
      'react-native-google-mobile-ads',
      {
        iosAppId: ADMOB_IOS_APP_ID,
      },
    ],
    'react-native-iap',
  ],
  extra: {
    EXPO_PUBLIC_IOS_IAP_WEEKLY_PRODUCT_ID: process.env.EXPO_PUBLIC_IOS_IAP_WEEKLY_PRODUCT_ID,
    EXPO_PUBLIC_IOS_IAP_MONTHLY_PRODUCT_ID: process.env.EXPO_PUBLIC_IOS_IAP_MONTHLY_PRODUCT_ID,
    EXPO_PUBLIC_IOS_IAP_YEARLY_PRODUCT_ID: process.env.EXPO_PUBLIC_IOS_IAP_YEARLY_PRODUCT_ID,
    EXPO_PUBLIC_ADMOB_IOS_APP_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
    EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
    EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID,
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_STRIPE_MERCHANT_ID: process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID ?? 'merchant.com.yourname.dumpitapp',
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_REMOVE_BG_API_KEY: process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY,
    EXPO_PUBLIC_NATIVE_CUTOUT: process.env.EXPO_PUBLIC_NATIVE_CUTOUT ?? '1',
    EXPO_PUBLIC_STRIPE_ENABLED: process.env.EXPO_PUBLIC_STRIPE_ENABLED ?? '1',
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GMAIL_OAUTH_REDIRECT_URI: process.env.EXPO_PUBLIC_GMAIL_OAUTH_REDIRECT_URI,
    eas: {
      projectId: 'e029b591-fa4b-4b36-82f5-4bbe186a5506',
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
