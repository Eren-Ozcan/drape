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

module.exports = config;
