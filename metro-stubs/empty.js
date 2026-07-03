// Stub for optional peer dependencies of @tensorflow-models/pose-detection
// and @tensorflow/tfjs-react-native that this app never exercises at
// runtime (we only use the MoveNet detector), but that Metro still tries
// to statically resolve because those libraries import every optional
// backend/model from their top-level barrel file.
module.exports = {};
