// app.config.js — place this in your PROJECT ROOT (same folder as package.json)
// This replaces or works alongside app.json.
// It passes your Supabase credentials into the app and sets the deep-link scheme
// so email confirmation links open your app instead of a blank localhost page.

export default ({ config }) => ({
  ...config,
  name: 'photodumps',
  slug: 'dumpitapp',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/brand-icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/brand-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#3B5BFC',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.yourname.dumpitapp',
    // ↓ This is what makes email links open your app instead of localhost
    infoPlist: {
      LSApplicationQueriesSchemes: ['dumpit'],
      NSPhotoLibraryAddUsageDescription:
        'photodumps saves your photo booth strips to your library when you tap Save.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/brand-icon.png',
      backgroundColor: '#3B5BFC',
    },
    package: 'com.yourname.dumpitapp',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'dumpit' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  // ↓ CRITICAL: this registers "dumpit://" as a deep-link scheme for your app
  scheme: 'dumpit',
  plugins: [
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
    'rn-remove-image-bg',
  ],
  extra: {
    // These get injected as Constants.expoConfig.extra inside the app
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_REMOVE_BG_API_KEY: process.env.EXPO_PUBLIC_REMOVE_BG_API_KEY,
    eas: {
      projectId: 'YOUR_EAS_PROJECT_ID', // fill in after running: eas init
    },
  },
  experiments: {
    typedRoutes: true,
  },
});
