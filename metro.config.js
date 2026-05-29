const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Load .env from app/ (Expo default only reads project root)
try {
  require('dotenv').config({ path: path.join(__dirname, 'app', '.env') });
} catch {
  /* dotenv optional */
}

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Supabase Edge Functions use Deno URL imports — never bundle them in the RN app.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  /[\\/]supabase[\\/]functions[\\/]/,
  /[\\/]app[\\/]supabase[\\/]functions[\\/]/,
];

const cutoutShim = path.resolve(projectRoot, 'app/_lib/stickerStudio/shims/noNativeCutout.ts');
const nitroShim = path.resolve(projectRoot, 'app/_lib/stickerStudio/shims/noNitroModules.ts');
const stripeShim = path.resolve(projectRoot, 'app/_lib/stripe/shims/noStripeNative.tsx');
const iabtcfCoreCjs = path.resolve(projectRoot, 'node_modules/@iabtcf/core/lib/cjs/index.js');
const defaultResolve = config.resolver.resolveRequest;

/**
 * Real native Vision/Core ML when not explicitly disabled.
 * Expo Go: use `npm start` (sets EXPO_PUBLIC_NATIVE_CUTOUT=0).
 * Dev client / EAS: use `npm run start:dev-client` or `npm run ios` (sets =1).
 */
const nativeCutoutEnabled = process.env.EXPO_PUBLIC_NATIVE_CUTOUT !== '0';

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === '@stripe/stripe-react-native' || moduleName.startsWith('@stripe/stripe-react-native/'))
  ) {
    return { type: 'sourceFile', filePath: stripeShim };
  }
  // Work around Metro resolving @iabtcf/core mjs imports in google-mobile-ads.
  if (moduleName === '@iabtcf/core') {
    return { type: 'sourceFile', filePath: iabtcfCoreCjs };
  }
  if (!nativeCutoutEnabled) {
    if (moduleName === 'rn-remove-image-bg') {
      return { type: 'sourceFile', filePath: cutoutShim };
    }
    if (
      moduleName === 'react-native-nitro-modules' ||
      moduleName.startsWith('react-native-nitro-modules/')
    ) {
      return { type: 'sourceFile', filePath: nitroShim };
    }
  }
  if (defaultResolve) {
    return defaultResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
