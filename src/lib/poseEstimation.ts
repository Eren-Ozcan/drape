import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { PoseKeypoints, NamedPoint } from './anthropometry';

// Lightning is MoveNet's smaller model variant — noticeably faster to load
// (cold-start) and to run per-frame than Thunder, at a modest accuracy cost
// that doesn't matter here since we only ever run a single still photo.
let readyPromise: Promise<void> | null = null;
let detector: poseDetection.PoseDetector | null = null;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await tf.ready();
      detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })();
  }
  return readyPromise;
}

// Lets a caller kick off model load ahead of time (e.g. as soon as the photo
// screen mounts) so the cold-start cost overlaps with the user framing/taking
// their photo instead of blocking after they tap "estimate".
export function warmUpPoseModel(): void {
  ensureReady().catch(() => {
    // swallow — detectPoseFromImageUri will surface the same failure later
  });
}

const MAX_POSE_INPUT_DIMENSION = 1024;
const POSE_INPUT_JPEG_QUALITY = 0.85;

// Camera photos can be arbitrarily large (12+ MP) and, on iOS, HEIC rather
// than JPEG — decodeJpeg needs actual JPEG bytes, and feeding it a
// multi-thousand-pixel image wastes memory/time for no accuracy benefit at
// MoveNet's input resolution. Normalize to a bounded JPEG copy first.
async function prepareImageForPoseDetection(uri: string): Promise<string> {
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });

  const context = ImageManipulator.manipulate(uri);
  const longSide = Math.max(width, height);
  if (longSide > MAX_POSE_INPUT_DIMENSION) {
    const scale = MAX_POSE_INPUT_DIMENSION / longSide;
    context.resize({ width: Math.round(width * scale), height: Math.round(height * scale) });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: POSE_INPUT_JPEG_QUALITY });
  return saved.uri;
}

export interface DetectedPose {
  keypoints: PoseKeypoints;
  imageWidth: number;
  imageHeight: number;
  rawKeypoints: Array<{ x: number; y: number; score?: number; name?: string }>;
}

const NAME_MAP: Record<string, keyof PoseKeypoints> = {
  nose: 'nose',
  left_eye: 'leftEye',
  right_eye: 'rightEye',
  left_ear: 'leftEar',
  right_ear: 'rightEar',
  left_shoulder: 'leftShoulder',
  right_shoulder: 'rightShoulder',
  left_elbow: 'leftElbow',
  right_elbow: 'rightElbow',
  left_wrist: 'leftWrist',
  right_wrist: 'rightWrist',
  left_hip: 'leftHip',
  right_hip: 'rightHip',
  left_knee: 'leftKnee',
  right_knee: 'rightKnee',
  left_ankle: 'leftAnkle',
  right_ankle: 'rightAnkle',
};

export async function detectPoseFromImageUri(uri: string): Promise<DetectedPose | null> {
  await ensureReady();
  if (!detector) throw new Error('Poz tahmin modeli yüklenemedi');

  const normalizedUri = await prepareImageForPoseDetection(uri);
  try {
    const base64 = await FileSystem.readAsStringAsync(normalizedUri, { encoding: FileSystem.EncodingType.Base64 });
    const raw = tf.util.encodeString(base64, 'base64').buffer;
    const imageTensor = decodeJpeg(new Uint8Array(raw));
    const [height, width] = imageTensor.shape;

    try {
      const poses = await detector.estimatePoses(imageTensor, { flipHorizontal: false });
      if (!poses.length) return null;

      const pose = poses[0];
      const keypoints: PoseKeypoints = {};
      pose.keypoints.forEach((k) => {
        const key = k.name ? NAME_MAP[k.name] : undefined;
        if (key) {
          keypoints[key] = { x: k.x, y: k.y, score: k.score ?? 0 } as NamedPoint;
        }
      });

      return {
        keypoints,
        imageWidth: width,
        imageHeight: height,
        rawKeypoints: pose.keypoints,
      };
    } finally {
      imageTensor.dispose();
    }
  } finally {
    // best-effort cleanup of the transient normalized copy in the cache dir
    await FileSystem.deleteAsync(normalizedUri, { idempotent: true }).catch(() => {});
  }
}
