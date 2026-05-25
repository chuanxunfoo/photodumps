/**
 * Expo config at project root (not inside app/ — that folder is expo-router routes only).
 * Env vars load from app/.env automatically (EXPO_PUBLIC_*).
 */
module.exports = ({ config }) => ({
  ...config,
  name: 'photodumps',
  slug: 'Dumplt',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './app/assets/brand-icon.png',
  userInterfaceStyle: 'dark',
  androidStatusBar: { translucent: true, backgroundColor: '#00000000' },
  splash: {
    image: './app/assets/brand-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#3B5BFC',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    appleTeamId: '75356Q29L5',
    supportsTablet: false,
    bundleIdentifier: 'com.yourname.dumpitapp',
    entitlements: {
      'com.apple.security.application-groups': ['group.com.yourname.dumpitapp.widgets'],
    },
    infoPlist: {
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
    '@bacons/apple-targets',
  ],
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_REMOVE_BG_API_KEY: process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY,
    EXPO_PUBLIC_NATIVE_CUTOUT: process.env.EXPO_PUBLIC_NATIVE_CUTOUT ?? '0',
    eas: {
      projectId: '1bd830d4-8001-4703-a60a-99538ef79f6b',
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
