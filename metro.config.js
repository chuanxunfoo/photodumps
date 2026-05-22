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

const cutoutShim = path.resolve(projectRoot, 'app/_lib/stickerStudio/shims/noNativeCutout.ts');
const nitroShim = path.resolve(projectRoot, 'app/_lib/stickerStudio/shims/noNitroModules.ts');
const defaultResolve = config.resolver.resolveRequest;

/** Native cutout packages are not installed for EAS; always resolve to shims (cloud/WASM cutout). */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'rn-remove-image-bg') {
    return { type: 'sourceFile', filePath: cutoutShim };
  }
  if (
    moduleName === 'react-native-nitro-modules' ||
    moduleName.startsWith('react-native-nitro-modules/')
  ) {
    return { type: 'sourceFile', filePath: nitroShim };
  }
  if (defaultResolve) {
    return defaultResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
