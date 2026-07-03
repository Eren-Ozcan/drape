import * as THREE from 'three';

export interface ProfilePoint {
  /** height along the revolve axis (meters) */
  y: number;
  /** radius at this height (meters) */
  r: number;
}

// Revolves a Catmull-Rom-smoothed radius profile around the Y axis, producing
// one continuous, seamless surface instead of stacked cone segments. `points`
// must be ordered from top (largest y) to bottom (smallest y).
export function buildLathe(points: ProfilePoint[], radialSegments = 28, samplesPerSpan = 10): THREE.LatheGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.r, p.y, 0)));
  const sampleCount = Math.max(2, (points.length - 1) * samplesPerSpan);
  const sampled = curve.getPoints(sampleCount);
  const profile = sampled.map((p) => new THREE.Vector2(Math.max(0.0005, p.x), p.y));
  return new THREE.LatheGeometry(profile, radialSegments);
}

// A perfectly round lathe reads as "inflated balloon" once a garment is
// loose enough to hang away from the body — real loose fabric buckles into
// vertical folds under its own weight. This perturbs the radius with a
// sine wave around the circumference, ramped in from `topY` (no folds,
// still close to the body) to `bottomY` (full folds at the hem where
// there's the most slack). Mutates `geometry` in place.
export function applyRadialFolds(
  geometry: THREE.LatheGeometry,
  opts: { amplitude: number; topY: number; bottomY: number; foldCount?: number }
): THREE.LatheGeometry {
  const { amplitude, topY, bottomY, foldCount = 10 } = opts;
  if (amplitude <= 0) return geometry;

  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const ramp = THREE.MathUtils.clamp((topY - v.y) / Math.max(0.001, topY - bottomY), 0, 1);
    if (ramp <= 0) continue;
    const theta = Math.atan2(v.z, v.x);
    const radius = Math.hypot(v.x, v.z);
    const perturbed = radius * (1 + amplitude * ramp * Math.sin(theta * foldCount));
    v.x = Math.cos(theta) * perturbed;
    v.z = Math.sin(theta) * perturbed;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
