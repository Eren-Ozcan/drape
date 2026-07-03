import { BodyMeasurements } from '../types/measurements';

// Ramanujan's second approximation for an ellipse's circumference.
function ellipseCircumference(semiA: number, semiB: number): number {
  const a = semiA;
  const b = semiB;
  if (a <= 0 || b <= 0) return 0;
  const h = Math.pow((a - b) / (a + b), 2);
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

// Converts a body-part width (cm) into an estimated circumference (cm) by
// modeling the cross-section as an ellipse whose depth is a fixed fraction
// of its width. These depth ratios are rough population averages — the
// resulting circumferences are estimates, not measurements, and are meant
// as a starting point the user can fine-tune manually.
function widthToCircumference(widthCm: number, depthRatio: number): number {
  const a = widthCm / 2;
  const b = a * depthRatio;
  return ellipseCircumference(a, b);
}

export interface NamedPoint {
  x: number;
  y: number;
  score: number;
}

export interface PoseKeypoints {
  nose?: NamedPoint;
  leftEye?: NamedPoint;
  rightEye?: NamedPoint;
  leftEar?: NamedPoint;
  rightEar?: NamedPoint;
  leftShoulder?: NamedPoint;
  rightShoulder?: NamedPoint;
  leftElbow?: NamedPoint;
  rightElbow?: NamedPoint;
  leftWrist?: NamedPoint;
  rightWrist?: NamedPoint;
  leftHip?: NamedPoint;
  rightHip?: NamedPoint;
  leftKnee?: NamedPoint;
  rightKnee?: NamedPoint;
  leftAnkle?: NamedPoint;
  rightAnkle?: NamedPoint;
}

const MIN_SCORE = 0.3;

// MoveNet's hip/shoulder keypoints sit at the joint centers, not on the body
// silhouette — the hip joint-to-joint distance is roughly half the actual
// hip width, and the shoulder (biacromial) distance runs ~10% narrower than
// where a tape measure would sit. These corrections and the ratios below
// (waist/hip, chest/shoulder, thigh/hip, neck/shoulder) were tuned together;
// don't adjust one without rechecking the others against a few reference
// photos with known tape measurements.
const HIP_JOINT_TO_SILHOUETTE = 1.7;
const SHOULDER_JOINT_TO_SILHOUETTE = 1.12;
// nose keypoint to ankle keypoint as a fraction of standing height — the
// nose sits a bit below the crown and the ankle a bit above the floor.
const NOSE_TO_ANKLE_HEIGHT_RATIO = 0.895;

function dist(a?: NamedPoint, b?: NamedPoint): number | null {
  if (!a || !b || a.score < MIN_SCORE || b.score < MIN_SCORE) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function avg(...vals: Array<number | null>): number | null {
  const valid = vals.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

export interface EstimationResult {
  measurements: Partial<BodyMeasurements>;
  estimatedFields: Array<keyof BodyMeasurements>;
  warnings: string[];
}

// knownHeightCm must be supplied by the user since a single 2D photo has no
// absolute scale reference otherwise.
export function estimateMeasurementsFromKeypoints(kp: PoseKeypoints, knownHeightCm: number): EstimationResult {
  const warnings: string[] = [];
  const measurements: Partial<BodyMeasurements> = {};
  const estimatedFields: Array<keyof BodyMeasurements> = [];

  const ankleY = avg(kp.leftAnkle?.score && kp.leftAnkle.score >= MIN_SCORE ? kp.leftAnkle.y : null, kp.rightAnkle?.score && kp.rightAnkle.score >= MIN_SCORE ? kp.rightAnkle.y : null);
  const noseY = kp.nose && kp.nose.score >= MIN_SCORE ? kp.nose.y : null;

  if (ankleY === null || noseY === null) {
    warnings.push('Ayak bilekleri veya baş net görünmüyor, ölçek hesaplanamadı. Tüm vücudun net görünen bir fotoğrafını kullan.');
    return { measurements, estimatedFields, warnings };
  }

  const pixelHeight = (ankleY - noseY) / NOSE_TO_ANKLE_HEIGHT_RATIO;
  if (pixelHeight <= 0) {
    warnings.push('Poz algılanamadı, lütfen dik ve tam boy görünen bir fotoğraf dene.');
    return { measurements, estimatedFields, warnings };
  }
  const scale = knownHeightCm / pixelHeight; // cm per pixel

  const shoulderWidthPx = dist(kp.leftShoulder, kp.rightShoulder);
  const hipWidthPx = dist(kp.leftHip, kp.rightHip);

  let shoulderWidthCm: number | null = null;
  if (shoulderWidthPx !== null) {
    shoulderWidthCm = shoulderWidthPx * scale * SHOULDER_JOINT_TO_SILHOUETTE;
    measurements.shoulderWidthCm = Number(shoulderWidthCm.toFixed(1));
    estimatedFields.push('shoulderWidthCm');
  }

  let hipWidthCm: number | null = null;
  if (hipWidthPx !== null) {
    hipWidthCm = hipWidthPx * scale * HIP_JOINT_TO_SILHOUETTE;
    const hipCirc = widthToCircumference(hipWidthCm, 0.68);
    measurements.hipCm = Number(hipCirc.toFixed(1));
    estimatedFields.push('hipCm');

    const thighCirc = hipCirc * 0.55;
    measurements.thighCm = Number(thighCirc.toFixed(1));
    estimatedFields.push('thighCm');

    const waistWidthCm = hipWidthCm * 0.86;
    const waistCirc = widthToCircumference(waistWidthCm, 0.75);
    measurements.waistCm = Number(waistCirc.toFixed(1));
    estimatedFields.push('waistCm');
  }

  if (shoulderWidthCm !== null) {
    const chestWidthCm = shoulderWidthCm * 0.9;
    const chestCirc = widthToCircumference(chestWidthCm, 0.62);
    measurements.chestCm = Number(chestCirc.toFixed(1));
    estimatedFields.push('chestCm');

    const neckWidthCm = shoulderWidthCm * 0.23;
    const neckCirc = widthToCircumference(neckWidthCm, 0.85);
    measurements.neckCm = Number(neckCirc.toFixed(1));
    estimatedFields.push('neckCm');
  }

  const armLenLeftPx = (() => {
    const a = dist(kp.leftShoulder, kp.leftElbow);
    const b = dist(kp.leftElbow, kp.leftWrist);
    return a !== null && b !== null ? a + b : null;
  })();
  const armLenRightPx = (() => {
    const a = dist(kp.rightShoulder, kp.rightElbow);
    const b = dist(kp.rightElbow, kp.rightWrist);
    return a !== null && b !== null ? a + b : null;
  })();
  const armLenPx = avg(armLenLeftPx, armLenRightPx);
  if (armLenPx !== null) {
    measurements.armLengthCm = Number((armLenPx * scale).toFixed(1));
    estimatedFields.push('armLengthCm');
  }

  const inseamLeftPx = (() => {
    const a = dist(kp.leftHip, kp.leftKnee);
    const b = dist(kp.leftKnee, kp.leftAnkle);
    return a !== null && b !== null ? a + b : null;
  })();
  const inseamRightPx = (() => {
    const a = dist(kp.rightHip, kp.rightKnee);
    const b = dist(kp.rightKnee, kp.rightAnkle);
    return a !== null && b !== null ? a + b : null;
  })();
  const inseamPx = avg(inseamLeftPx, inseamRightPx);
  if (inseamPx !== null) {
    measurements.inseamCm = Number((inseamPx * scale).toFixed(1));
    estimatedFields.push('inseamCm');
  }

  measurements.heightCm = knownHeightCm;

  warnings.push(
    'Çevre ölçüleri (göğüs, bel, kalça, boyun, uyluk) tek fotoğraftan istatistiksel oranlarla tahmin edilir; gerçek mezürle ölçüme göre birkaç santim sapabilir. Kaydetmeden önce gözden geçir.'
  );

  return { measurements, estimatedFields, warnings };
}
