import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as FileSystem from 'expo-file-system/legacy';
import { PoseKeypoints, NamedPoint } from './anthropometry';

let readyPromise: Promise<void> | null = null;
let detector: poseDetection.PoseDetector | null = null;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await tf.ready();
      detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      });
    })();
  }
  return readyPromise;
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

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
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
}
