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

/** Real native ML only when Metro starts with EXPO_PUBLIC_NATIVE_CUTOUT=1 */
const useNativeCutout = process.env.EXPO_PUBLIC_NATIVE_CUTOUT === '1';

const SHIMMED = new Set(['rn-remove-image-bg', 'react-native-nitro-modules']);
const shimPath = path.resolve(projectRoot, 'app/_lib/stickerStudio/shims/noNativeCutout.ts');
const defaultResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (!useNativeCutout && SHIMMED.has(moduleName)) {
    return { type: 'sourceFile', filePath: shimPath };
  }
  if (defaultResolve) {
    return defaultResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
