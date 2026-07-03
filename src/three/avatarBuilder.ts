import * as THREE from 'three';
import { BodyRig } from './bodyRig';
import { buildLathe } from './lathe';

const SKIN = 0xd9a97a;

function skinMaterial(): THREE.MeshPhysicalMaterial {
  // MeshPhysicalMaterial's clearcoat gives skin a subtle organic sheen that
  // flat MeshStandardMaterial can't reproduce — a cheap but real fidelity win.
  return new THREE.MeshPhysicalMaterial({
    color: SKIN,
    roughness: 0.55,
    metalness: 0.02,
    clearcoat: 0.15,
    clearcoatRoughness: 0.45,
  });
}

function torsoLathe(rig: BodyRig, material: THREE.Material): THREE.Mesh {
  const hipMidY = rig.crotchY + (rig.waistY - rig.crotchY) * 0.35;
  const shoulderR = rig.chestR * rig.shoulderFlare;
  const geometry = buildLathe([
    { y: rig.neckTopY, r: rig.neckR * 0.95 },
    { y: rig.neckBaseY, r: rig.neckR * 1.03 },
    { y: rig.shoulderY, r: shoulderR },
    { y: rig.chestY, r: rig.chestR },
    { y: rig.waistY, r: rig.waistR },
    { y: hipMidY, r: rig.hipR * rig.hipFlare },
    { y: rig.crotchY, r: rig.hipR * 0.5 },
  ]);
  return new THREE.Mesh(geometry, material);
}

function limbLathe(points: { y: number; r: number }[], material: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(buildLathe(points, 20), material);
}

export function buildAvatarGroup(rig: BodyRig): THREE.Group {
  const group = new THREE.Group();
  group.name = 'avatar';
  const material = skinMaterial();

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(rig.headR, 28, 22), material);
  head.position.y = rig.headCenterY;
  group.add(head);

  // torso + neck as one continuous surface (no seams between neck/chest/waist/hip)
  group.add(torsoLathe(rig, material));

  // shoulder cap: bridges the radius jump between the torso's shoulder point
  // and the much narrower arm attachment, hiding what would otherwise be a
  // visible step where the arm meets the body.
  const shoulderCapR = rig.armR * 1.35;

  // arms (relaxed A-pose, ~14 degrees away from body), each a single lathe
  // from shoulder to wrist instead of separate upper-arm/forearm capsules.
  const armAngle = THREE.MathUtils.degToRad(14);
  [-1, 1].forEach((side) => {
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(shoulderCapR, 20, 16), material);
    shoulderCap.position.set(side * rig.shoulderHalfWidth, rig.shoulderY - rig.chestR * 0.08, 0);
    group.add(shoulderCap);

    const armGroup = new THREE.Group();
    armGroup.position.copy(shoulderCap.position);
    armGroup.rotation.z = side * armAngle;

    const arm = limbLathe(
      [
        { y: 0, r: rig.armR * 1.05 },
        { y: -rig.upperArmLength * 0.4, r: rig.armR },
        { y: -rig.upperArmLength, r: rig.armR * 0.75 },
        { y: -rig.upperArmLength - rig.forearmLength * 0.5, r: rig.forearmR * 1.05 },
        { y: -rig.upperArmLength - rig.forearmLength, r: rig.forearmR * 0.62 },
      ],
      material
    );
    armGroup.add(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(rig.forearmR * 0.85, 14, 12), material);
    hand.position.y = -rig.upperArmLength - rig.forearmLength - rig.forearmR * 0.5;
    hand.scale.set(1, 0.75, 1.15);
    armGroup.add(hand);

    group.add(armGroup);
  });

  // hip cap: bridges the torso's tapered pelvis floor to each leg's top radius
  const hipCapR = rig.thighR * 0.95;
  const hipStanceOffset = rig.hipHalfWidth * 0.42;

  [-1, 1].forEach((side) => {
    const hipCap = new THREE.Mesh(new THREE.SphereGeometry(hipCapR, 18, 14), material);
    hipCap.position.set(side * hipStanceOffset * 0.6, rig.crotchY - hipCapR * 0.3, 0);
    group.add(hipCap);

    const thighLength = rig.crotchY - rig.kneeY;
    const shinLength = rig.kneeY - rig.ankleY;

    const legGroup = new THREE.Group();
    legGroup.position.set(side * hipStanceOffset, rig.crotchY, 0);

    const leg = limbLathe(
      [
        { y: 0, r: rig.thighR * 0.92 },
        { y: -thighLength * 0.4, r: rig.thighR },
        { y: -thighLength, r: rig.thighR * 0.7 },
        { y: -thighLength - shinLength * 0.5, r: rig.shinR * 1.08 },
        { y: -thighLength - shinLength, r: rig.shinR * 0.6 },
      ],
      material
    );
    legGroup.add(leg);
    group.add(legGroup);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(rig.shinR * 1.6, rig.ankleY * 0.9, rig.shinR * 2.6), material);
    foot.position.set(side * hipStanceOffset, rig.ankleY / 2, rig.shinR * 0.9);
    group.add(foot);
  });

  return group;
}
