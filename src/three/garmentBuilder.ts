import * as THREE from 'three';
import { BodyRig } from './bodyRig';
import { BodyMeasurements, Garment, GarmentCategory, FitResult, Rating } from '../types/measurements';
import { classifyFit, classifyLength } from '../lib/fit';
import { buildLathe, applyRadialFolds, ProfilePoint } from './lathe';

export interface GarmentFitSummary {
  label: string;
  fit: Rating;
}

export interface GarmentBuildResult {
  group: THREE.Group;
  fitSummaries: GarmentFitSummary[];
}

const MIN_EASE_M = 0.004; // keep garment surface just outside the body mesh to avoid z-fighting
const MAX_EASE_M = 0.09;

function easeRadius(garmentCm: number, bodyCm: number): { offsetM: number; fit: FitResult } {
  const fit = classifyFit(garmentCm, bodyCm);
  const rawOffsetM = fit.deltaCm / 100 / (2 * Math.PI);
  const offsetM = THREE.MathUtils.clamp(rawOffsetM, MIN_EASE_M, MAX_EASE_M);
  return { offsetM, fit };
}

// MeshPhysicalMaterial's `sheen` channel is built specifically to fake the
// soft, fibrous highlight of woven/knit fabric — fleece reads glossier and
// broader than cotton, denim reads almost matte. Tuning it per category is a
// cheap, real fidelity gain over a flat MeshStandardMaterial for every garment.
function garmentMaterial(color: string, category: GarmentCategory): THREE.MeshPhysicalMaterial {
  const bySheen: Record<GarmentCategory, { roughness: number; sheen: number; sheenRoughness: number }> = {
    tshirt: { roughness: 0.82, sheen: 0.35, sheenRoughness: 0.55 },
    shirt: { roughness: 0.7, sheen: 0.4, sheenRoughness: 0.5 },
    hoodie: { roughness: 0.9, sheen: 0.6, sheenRoughness: 0.7 },
    pants: { roughness: 0.75, sheen: 0.15, sheenRoughness: 0.4 },
  };
  const tuning = bySheen[category];
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: tuning.roughness,
    metalness: 0.0,
    sheen: tuning.sheen,
    sheenRoughness: tuning.sheenRoughness,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.5),
    side: THREE.DoubleSide,
  });
}

function garmentLathe(points: ProfilePoint[], material: THREE.Material, segments = 26) {
  return new THREE.Mesh(buildLathe(points, segments), material);
}

// A flat, tapered triangular flap — the classic folded-down point of a shirt
// collar. Wide at the standing band, narrowing to a point at the chest.
function collarPointGeometry(width: number, length: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, -length);
  shape.lineTo(-width / 2, 0);
  return new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.002, width * 0.05), bevelEnabled: false });
}

// Per-category collar/neckline. Distinct silhouettes read as different
// garment types even before color/material differences register.
function buildCollar(category: GarmentCategory, rig: BodyRig, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'collar';
  const neckY = rig.shoulderY;

  if (category === 'shirt') {
    // Standing band plus two folded-down points meeting in a V at the chest.
    const band = new THREE.Mesh(new THREE.TorusGeometry(rig.neckR * 1.12, rig.neckR * 0.14, 8, 20), material);
    band.rotation.x = Math.PI / 2;
    band.position.y = neckY + 0.015;
    group.add(band);

    const pointGeo = collarPointGeometry(rig.neckR * 0.9, rig.neckR * 1.3);
    [-1, 1].forEach((side) => {
      const point = new THREE.Mesh(pointGeo, material);
      point.position.set(side * rig.neckR * 0.5, neckY - 0.005, rig.neckR * 0.9);
      point.rotation.x = -Math.PI / 2.3;
      point.rotation.z = side * -0.3;
      group.add(point);
    });
    return group;
  }

  if (category === 'hoodie') {
    // Thicker ribbed band plus two hanging drawstrings — the hood cone
    // itself is added separately by the caller.
    const band = new THREE.Mesh(new THREE.TorusGeometry(rig.neckR * 1.18, rig.neckR * 0.3, 10, 20), material);
    band.rotation.x = Math.PI / 2;
    band.position.y = neckY + 0.012;
    group.add(band);

    const stringMaterial = new THREE.MeshStandardMaterial({ color: 0xe6ded2, roughness: 0.85 });
    const stringLength = rig.neckR * 2.6;
    const agletGeo = new THREE.SphereGeometry(rig.neckR * 0.09, 8, 8);
    const cordGeo = new THREE.CylinderGeometry(rig.neckR * 0.05, rig.neckR * 0.05, stringLength, 6);
    [-1, 1].forEach((side) => {
      const cord = new THREE.Mesh(cordGeo, stringMaterial);
      cord.position.set(side * rig.neckR * 0.35, neckY - stringLength * 0.5, rig.neckR * 0.98);
      cord.rotation.z = side * 0.05;
      group.add(cord);

      const aglet = new THREE.Mesh(agletGeo, stringMaterial);
      aglet.position.set(cord.position.x, neckY - stringLength, rig.neckR * 0.98);
      group.add(aglet);
    });
    return group;
  }

  // Crew neck — t-shirt/default: a small ring close to the body.
  const crew = new THREE.Mesh(new THREE.TorusGeometry(rig.neckR * 1.05, rig.neckR * 0.18, 8, 20), material);
  crew.rotation.x = Math.PI / 2;
  crew.position.y = neckY + 0.01;
  group.add(crew);
  return group;
}

export function buildTopGarment(rig: BodyRig, body: BodyMeasurements, garment: Garment): GarmentBuildResult {
  if (!garment.top) throw new Error('Garment has no top measurements');
  const { top } = garment;
  const material = garmentMaterial(garment.color, garment.category);

  const chestEase = easeRadius(top.chestCm, body.chestCm);
  const waistEase = easeRadius(top.chestCm * 0.94, body.waistCm);
  const shoulderFit = classifyFit(top.shoulderCm, body.shoulderWidthCm);
  const sleeveFit = classifyLength(top.sleeveCm, body.armLengthCm, 'sleeve');

  const group = new THREE.Group();
  group.name = `garment-top-${garment.id}`;

  // Fabric drapes looser toward the hem than it hugs at the shoulder —
  // taper the ease outward the further down the garment goes, instead of a
  // uniform offset, for a more natural fall.
  const shoulderR = rig.chestR * rig.shoulderFlare + chestEase.offsetM;
  const chestR = rig.chestR + chestEase.offsetM;
  const waistR = rig.waistR + waistEase.offsetM * 1.05;
  const hipR = rig.hipR + waistEase.offsetM * 1.2 * rig.hipFlare;

  const lengthM = top.lengthCm / 100;
  const hemY = THREE.MathUtils.clamp(rig.shoulderY - lengthM, rig.crotchY - 0.05, rig.chestY - 0.02);

  const bodyPoints: ProfilePoint[] = [
    { y: rig.shoulderY, r: shoulderR },
    { y: rig.chestY, r: chestR },
  ];
  if (hemY < rig.waistY) {
    bodyPoints.push({ y: rig.waistY, r: waistR });
    bodyPoints.push({ y: hemY, r: hipR });
  } else {
    const t = (rig.chestY - hemY) / Math.max(0.001, rig.chestY - rig.waistY);
    const hemR = THREE.MathUtils.lerp(chestR, waistR, THREE.MathUtils.clamp(t, 0, 1));
    bodyPoints.push({ y: hemY, r: hemR });
  }
  const bodyMesh = garmentLathe(bodyPoints, material);
  // Loose/oversize fits hang away from the body enough to buckle into
  // visible vertical folds — a perfectly round lathe reads as an inflated
  // balloon once the ease gets past "regular". Ramps in from nothing at the
  // shoulder to full amplitude at the hem, scaled by how loose the chest is.
  const foldAmplitude = THREE.MathUtils.clamp((chestEase.offsetM - 0.02) * 2.2, 0, 0.14);
  applyRadialFolds(bodyMesh.geometry as THREE.LatheGeometry, {
    amplitude: foldAmplitude,
    topY: rig.shoulderY,
    bottomY: hemY,
  });
  group.add(bodyMesh);

  group.add(buildCollar(garment.category, rig, material));

  // sleeves — a single lathe from shoulder to cuff instead of a plain capsule
  const sleeveLengthM = Math.max(0.05, top.sleeveCm / 100);
  const armAngle = THREE.MathUtils.degToRad(14);
  [-1, 1].forEach((side) => {
    const sleeveR = rig.armR + chestEase.offsetM * 0.8;
    const holder = new THREE.Group();
    holder.position.set(side * rig.shoulderHalfWidth, rig.shoulderY - rig.chestR * 0.08, 0);
    holder.rotation.z = side * armAngle;
    holder.add(
      garmentLathe(
        [
          { y: 0, r: sleeveR * 1.18 },
          { y: -sleeveLengthM * 0.5, r: sleeveR * 1.05 },
          { y: -sleeveLengthM, r: sleeveR },
        ],
        material,
        18
      )
    );
    group.add(holder);
  });

  if (garment.category === 'hoodie') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(rig.headR * 1.15, rig.headR * 1.5, 16, 1, true), material);
    hood.rotation.x = Math.PI * 0.92;
    hood.position.set(0, rig.neckTopY + rig.headR * 0.1, -rig.headR * 0.55);
    group.add(hood);

    // Only place the kangaroo pocket if the hem actually reaches the waist —
    // and size/position it against the garment's real radius at that height
    // (interpolated between the waist and hem points) instead of a fixed
    // hip radius, so it doesn't float below the hem or sink into the belly
    // on bodies where the waist is wider than the hip.
    if (hemY < rig.waistY) {
      const pocketY = rig.waistY - (rig.waistY - hemY) * 0.35;
      const t = THREE.MathUtils.clamp((rig.waistY - pocketY) / Math.max(0.001, rig.waistY - hemY), 0, 1);
      const pocketR = THREE.MathUtils.lerp(waistR, hipR, t);
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(pocketR * 1.15, pocketR * 0.6, 0.02), material);
      pocket.position.set(0, pocketY, pocketR * 0.98);
      group.add(pocket);
    }
  }

  return {
    group,
    fitSummaries: [
      { label: 'Göğüs', fit: chestEase.fit },
      { label: 'Omuz', fit: shoulderFit },
      { label: 'Kol boyu', fit: sleeveFit },
    ],
  };
}

export function buildBottomGarment(rig: BodyRig, body: BodyMeasurements, garment: Garment): GarmentBuildResult {
  if (!garment.bottom) throw new Error('Garment has no bottom measurements');
  const { bottom } = garment;
  const material = garmentMaterial(garment.color, garment.category);

  const waistEase = easeRadius(bottom.waistCm, body.waistCm);
  const hipEase = easeRadius(bottom.hipCm, body.hipCm);
  const inseamFit = classifyLength(bottom.inseamCm, body.inseamCm, 'inseam');

  const group = new THREE.Group();
  group.name = `garment-bottom-${garment.id}`;

  const waistR = rig.waistR + waistEase.offsetM;
  const hipR = rig.hipR + hipEase.offsetM;
  group.add(garmentLathe([{ y: rig.waistY, r: waistR }, { y: rig.crotchY, r: hipR }], material));

  const inseamLengthM = bottom.inseamCm / 100;
  const hemY = THREE.MathUtils.clamp(rig.crotchY - inseamLengthM, 0.02, rig.crotchY - 0.05);
  const kneeT = THREE.MathUtils.clamp((rig.crotchY - rig.kneeY) / Math.max(0.001, rig.crotchY - hemY), 0, 1);

  const hipStanceOffset = rig.hipHalfWidth * 0.42;
  // legOpeningCm is a flat width (like the waist/hip "x2" convention), not a
  // circumference — circumference of the flattened tube ≈ width×2, so
  // radius = width/π (not width/2π, which was reading it as already-round).
  const legOpeningR = Math.max(0.03, bottom.legOpeningCm / 100 / Math.PI);

  [-1, 1].forEach((side) => {
    const thighR = rig.thighR + hipEase.offsetM * 0.9;
    const kneeR = THREE.MathUtils.lerp(thighR, legOpeningR, kneeT * 0.6);

    const points: ProfilePoint[] = [{ y: rig.crotchY, r: thighR }];
    if (hemY < rig.kneeY) {
      points.push({ y: rig.kneeY, r: kneeR });
      points.push({ y: hemY, r: legOpeningR });
    } else {
      points.push({ y: hemY, r: kneeR });
    }

    const leg = garmentLathe(points, material, 20);
    leg.position.x = side * hipStanceOffset;
    group.add(leg);
  });

  return {
    group,
    fitSummaries: [
      { label: 'Bel', fit: waistEase.fit },
      { label: 'Kalça', fit: hipEase.fit },
      { label: 'Paça boyu', fit: inseamFit },
    ],
  };
}

export function buildGarment(rig: BodyRig, body: BodyMeasurements, garment: Garment): GarmentBuildResult {
  return garment.top ? buildTopGarment(rig, body, garment) : buildBottomGarment(rig, body, garment);
}
