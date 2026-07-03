// Learn more https://docs.expo.dev/guides/monorepos/#metro-configuration
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const emptyStub = path.resolve(__dirname, 'metro-stubs/empty.js');

// @tensorflow-models/pose-detection and @tensorflow/tfjs-react-native import
// every optional model/backend from their top-level entry point, even
// though we only ever use MoveNet. Point the modules we don't ship at a
// no-op stub instead of installing their (often native or web-only,
// multi-hundred-MB) optional peer dependencies.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-fs': emptyStub,
  '@mediapipe/pose': emptyStub,
  '@mediapipe/selfie_segmentation': emptyStub,
  '@tensorflow/tfjs-backend-webgpu': emptyStub,
  '@tensorflow/tfjs-backend-wasm': emptyStub,
};

// @gradio/client statically `import()`s the Node builtins `fs/promises` and
// `path` for a Node.js-only file-reading code path (guarded at runtime by a
// `process.versions.node` check that's always false on React Native — but
// Metro still needs to resolve the import at bundle time). extraNodeModules
// doesn't intercept these because Metro treats a slash-containing specifier
// as "package + subpath" rather than an exact key, so a resolveRequest
// override is needed instead.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'fs/promises' || moduleName === 'path') {
    return { type: 'sourceFile', filePath: emptyStub };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
