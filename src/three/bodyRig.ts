import { BodyMeasurements, Gender } from '../types/measurements';

// Pure-math anthropometric layout, independent of any rendering engine.
// Converts circumference measurements (cm) to radii (m) assuming a
// roughly circular cross-section, and distributes body height across
// segments using standard adult proportion ratios anchored to the
// user's actual inseam (leg length) and circumferences so the rig
// reflects their real measurements rather than a generic average body.

const toR = (circumferenceCm: number) => circumferenceCm / 100 / (2 * Math.PI);

export interface BodyRig {
  heightM: number;
  // vertical positions, measured from the floor (y = 0)
  floorY: number;
  ankleY: number;
  kneeY: number;
  crotchY: number;
  waistY: number;
  chestY: number;
  shoulderY: number;
  neckBaseY: number;
  neckTopY: number;
  headTopY: number;
  headCenterY: number;
  // radii in meters
  headR: number;
  neckR: number;
  chestR: number;
  waistR: number;
  hipR: number;
  thighR: number;
  shinR: number;
  armR: number;
  forearmR: number;
  // widths / lengths in meters
  shoulderHalfWidth: number;
  hipHalfWidth: number;
  armLength: number;
  upperArmLength: number;
  forearmLength: number;
  // silhouette-curve tuning only — never changes a measured radius, just how
  // the torso lathe swings between the measured points
  shoulderFlare: number;
  hipFlare: number;
}

// Multiplier applied to chestR to get the torso lathe's shoulder-point
// radius, and a multiplier on the hip bulge point between waist and crotch.
// Both are silhouette-shape nudges, not measurement overrides: hipR itself
// (used at the crotch point) always comes straight from hipCm.
const GENDER_PROFILE: Record<Gender, { shoulderFlare: number; hipFlare: number; waistYRatio: number }> = {
  male: { shoulderFlare: 1.09, hipFlare: 0.97, waistYRatio: 0.6 },
  female: { shoulderFlare: 1.02, hipFlare: 1.05, waistYRatio: 0.55 },
  unisex: { shoulderFlare: 1.06, hipFlare: 1.0, waistYRatio: 0.58 },
};

export function buildBodyRig(m: BodyMeasurements): BodyRig {
  const heightM = m.heightCm / 100;
  // Each field is independently range-validated in the UI, but an inseam
  // near its own max combined with a height near its own min is still a
  // physically implausible combination (legs longer than the whole body).
  // Clamp here, at the geometry layer, so a bad combination degrades to a
  // slightly-off proportion instead of an inverted/collapsed torso.
  const legLength = Math.min(m.inseamCm / 100, heightM * 0.53); // crotch to floor
  const kneeY = legLength * 0.49;
  const crotchY = legLength;

  const headR = Math.max(0.08, (m.neckCm / 100 / (2 * Math.PI)) * 1.55);
  const headHeight = headR * 2.15;
  const neckHeight = Math.max(0.03, heightM * 0.02);

  const headTopY = heightM;
  const headCenterY = headTopY - headR * 1.05;
  const neckTopY = headCenterY - headR * 1.05;
  const neckBaseY = neckTopY - neckHeight;
  const shoulderY = neckBaseY;

  const profile = GENDER_PROFILE[m.gender ?? 'unisex'];

  // torso spans from shoulders down to the crotch; distribute chest/waist/hip within it
  const chestY = shoulderY - (shoulderY - crotchY) * 0.22;
  const waistY = shoulderY - (shoulderY - crotchY) * profile.waistYRatio;

  return {
    heightM,
    floorY: 0,
    ankleY: 0.06,
    kneeY,
    crotchY,
    waistY,
    chestY,
    shoulderY,
    neckBaseY,
    neckTopY,
    headTopY,
    headCenterY,
    headR,
    neckR: Math.max(0.045, toR(m.neckCm) * 0.92),
    chestR: toR(m.chestCm),
    waistR: toR(m.waistCm),
    hipR: toR(m.hipCm),
    thighR: toR(m.thighCm),
    shinR: toR(m.thighCm) * 0.68,
    armR: toR(m.chestCm) * 0.36,
    forearmR: toR(m.chestCm) * 0.29,
    shoulderHalfWidth: m.shoulderWidthCm / 200,
    hipHalfWidth: toR(m.hipCm) * 0.92,
    armLength: m.armLengthCm / 100,
    upperArmLength: (m.armLengthCm / 100) * 0.47,
    forearmLength: (m.armLengthCm / 100) * 0.53,
    shoulderFlare: profile.shoulderFlare,
    hipFlare: profile.hipFlare,
  };
}
