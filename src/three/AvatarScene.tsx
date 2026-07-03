import React, { useEffect, useRef } from 'react';
import { View, PanResponder, StyleSheet, ViewStyle } from 'react-native';
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer } from 'expo-three';
import { DeviceMotion } from 'expo-sensors';
import * as THREE from 'three';
import { BodyMeasurements, Garment } from '../types/measurements';
import { buildBodyRig } from './bodyRig';
import { buildAvatarGroup } from './avatarBuilder';
import { buildGarment, GarmentFitSummary } from './garmentBuilder';

interface Props {
  body: BodyMeasurements;
  garment?: Garment | null;
  autoRotate?: boolean;
  transparentBackground?: boolean;
  style?: ViewStyle;
  onFitSummaries?: (summaries: GarmentFitSummary[]) => void;
  // Set to false when the screen isn't focused (e.g. a native-stack screen
  // sitting underneath another one, still mounted but not visible) to skip
  // GPU work instead of rendering frames nobody sees.
  active?: boolean;
  // Counter-rotates the camera against device tilt (read from the gyro/
  // accelerometer fusion in expo-sensors) so the model feels anchored in
  // space as you move the phone, instead of stuck flat to the screen. This
  // is a 3DOF approximation, not real SLAM/world tracking — Expo Go has no
  // access to ARKit/ARCore plane or body tracking.
  deviceStabilized?: boolean;
  // Dollies the camera toward/away from the model (1 = default distance).
  // Prefer this over wrapping the view in a CSS-style transform scale —
  // that just stretches the already-rendered pixels and looks soft past
  // 100%, while this re-renders at the true resolution for any zoom level.
  zoom?: number;
  // Set to false when a parent view already owns pan gestures (e.g. AR mode
  // dragging the whole overlay) — otherwise this component's own drag-to-
  // rotate responder wins the gesture first and the parent never sees it.
  interactive?: boolean;
}

// Frees GPU-side buffers for everything under `root`. Three.js does not do
// this automatically — leaving it out leaks a geometry+material per rebuild.
function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (mesh as THREE.Mesh).material;
    if (material) {
      const materials = Array.isArray(material) ? material : [material];
      materials.forEach((m) => {
        Object.values(m).forEach((value) => {
          if (value && typeof value === 'object' && 'isTexture' in value) {
            (value as THREE.Texture).dispose();
          }
        });
        m.dispose();
      });
    }
  });
}

export function AvatarScene({
  body,
  garment,
  autoRotate = true,
  transparentBackground = false,
  style,
  onFitSummaries,
  active = true,
  deviceStabilized = false,
  zoom = 1,
  interactive = true,
}: Props) {
  const rotationY = useRef(0);
  const dragStartRotation = useRef(0);
  const rotationRigRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const fitGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraBasePositionRef = useRef(new THREE.Vector3());
  const cameraBaseLookAtRef = useRef(new THREE.Vector3());
  const tiltOffsetRef = useRef({ pitch: 0, yaw: 0 });
  const tiltBaselineRef = useRef<{ beta: number; alpha: number } | null>(null);
  const scratchOffsetRef = useRef(new THREE.Vector3());
  const scratchSphericalRef = useRef(new THREE.Spherical());
  const glRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const renderLoopRef = useRef<(() => void) | null>(null);

  const autoRotateRef = useRef(autoRotate);
  const activeRef = useRef(active);
  const zoomRef = useRef(zoom);
  const bodyRef = useRef(body);
  const garmentRef = useRef(garment);
  const onFitSummariesRef = useRef(onFitSummaries);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    activeRef.current = active;
    // If we were paused (no frame currently scheduled) and just became
    // active again, kick the loop back on — it stops scheduling itself
    // entirely while inactive rather than waking up 60x/sec to do nothing.
    if (active && rafRef.current === null) {
      renderLoopRef.current?.();
    }
  }, [active]);

  useEffect(() => {
    if (!deviceStabilized) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      // Required on iOS (and mobile web) before DeviceMotion will actually
      // report anything — without it the subscription silently no-ops.
      const { granted } = await DeviceMotion.requestPermissionsAsync();
      if (!granted || cancelled) return;

      tiltBaselineRef.current = null;
      DeviceMotion.setUpdateInterval(33);
      sub = DeviceMotion.addListener((measurement) => {
        // Some devices deliver an early event before the fused orientation
        // is ready, with `rotation` still null — skip those instead of
        // throwing on the destructure.
        if (!measurement.rotation) return;
        const { beta, alpha } = measurement.rotation;
        if (!tiltBaselineRef.current) {
          tiltBaselineRef.current = { beta, alpha };
        }
        const baseline = tiltBaselineRef.current;
        // beta: forward/back tilt (pitch), alpha: compass heading (yaw) —
        // both in radians. Small clamp keeps the illusion subtle instead of
        // nauseous.
        tiltOffsetRef.current = {
          pitch: THREE.MathUtils.clamp(beta - baseline.beta, -0.6, 0.6),
          yaw: THREE.MathUtils.clamp(alpha - baseline.alpha, -0.6, 0.6),
        };
      });
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      tiltOffsetRef.current = { pitch: 0, yaw: 0 };
    };
  }, [deviceStabilized]);

  // Rebuilds only the avatar+garment meshes in place, disposing the
  // previous ones — the GL context, renderer, camera and lights persist
  // across body/garment changes instead of being torn down and recreated.
  const rebuildFit = () => {
    const scene = sceneRef.current;
    const rotationRig = rotationRigRef.current;
    if (!scene || !rotationRig) return;

    if (fitGroupRef.current) {
      rotationRig.remove(fitGroupRef.current);
      disposeObject3D(fitGroupRef.current);
      fitGroupRef.current = null;
    }

    const rig = buildBodyRig(bodyRef.current);
    const fitGroup = new THREE.Group();
    fitGroup.add(buildAvatarGroup(rig));

    const currentGarment = garmentRef.current;
    if (currentGarment) {
      const { group, fitSummaries } = buildGarment(rig, bodyRef.current, currentGarment);
      fitGroup.add(group);
      onFitSummariesRef.current?.(fitSummaries);
    } else {
      onFitSummariesRef.current?.([]);
    }

    fitGroup.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    if (transparentBackground) {
      // Real shadow mapping is off in AR mode (no opaque ground to receive
      // it), so the model otherwise looks like it's floating over the
      // camera feed. A cheap unlit blob under the feet is enough to read as
      // "grounded" without needing real shadow geometry.
      const blob = new THREE.Mesh(
        new THREE.CircleGeometry(rig.thighR * 3.2, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
      );
      blob.rotation.x = -Math.PI / 2;
      blob.position.y = 0.002;
      fitGroup.add(blob);
    }

    rotationRig.add(fitGroup);
    fitGroupRef.current = fitGroup;

    const camera = cameraRef.current;
    const gl = glRef.current;
    if (camera && gl) {
      const eyeY = rig.heightM * 0.56;
      const basePos = new THREE.Vector3(0, eyeY, rig.heightM * 1.7);
      const baseLookAt = new THREE.Vector3(0, eyeY * 0.95, 0);
      cameraBasePositionRef.current.copy(basePos);
      cameraBaseLookAtRef.current.copy(baseLookAt);
      camera.position.copy(basePos);
      camera.lookAt(baseLookAt);
      camera.aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
      camera.updateProjectionMatrix();
    }
  };

  useEffect(() => {
    bodyRef.current = body;
    garmentRef.current = garment;
    onFitSummariesRef.current = onFitSummaries;
    rebuildFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body, garment]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (fitGroupRef.current) disposeObject3D(fitGroupRef.current);
      if (sceneRef.current) disposeObject3D(sceneRef.current);
      rendererRef.current?.dispose();
    };
  }, []);

  const interactiveRef = useRef(interactive);
  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => interactiveRef.current,
      onMoveShouldSetPanResponder: () => interactiveRef.current,
      onPanResponderGrant: () => {
        dragStartRotation.current = rotationY.current;
      },
      onPanResponderMove: (_evt, gesture) => {
        rotationY.current = dragStartRotation.current + gesture.dx * 0.01;
        if (rotationRigRef.current) rotationRigRef.current.rotation.y = rotationY.current;
      },
    })
  ).current;

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    glRef.current = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x0f1115, transparentBackground ? 0 : 1);
    renderer.shadowMap.enabled = !transparentBackground;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    cameraRef.current = camera;

    // Two-tone sky/ground ambient reads far more natural than a flat
    // AmbientLight — the top of the body picks up cool "sky" bounce, the
    // underside picks up warm "ground" bounce.
    scene.add(new THREE.HemisphereLight(0xdbe8ff, 0x3a2f28, 0.65));

    const rig0 = buildBodyRig(bodyRef.current);
    const key = new THREE.DirectionalLight(0xfff4e6, 1.05);
    key.position.set(1.6, rig0.heightM * 1.6, 2.2);
    if (!transparentBackground) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      const shadowExtent = rig0.heightM * 0.75;
      key.shadow.camera.left = -shadowExtent;
      key.shadow.camera.right = shadowExtent;
      key.shadow.camera.top = shadowExtent;
      key.shadow.camera.bottom = -shadowExtent;
      key.shadow.camera.near = 0.1;
      key.shadow.camera.far = rig0.heightM * 4;
      key.shadow.bias = -0.0015;
    }
    scene.add(key);
    scene.add(key.target);

    const fill = new THREE.DirectionalLight(0xaac8ff, 0.3);
    fill.position.set(-2, rig0.heightM * 0.9, -1);
    scene.add(fill);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.35);
    rimLight.position.set(0, rig0.heightM * 1.2, -3);
    scene.add(rimLight);

    if (!transparentBackground) {
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(rig0.heightM * 0.9, 40),
        new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 1 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
    }

    const rotationRig = new THREE.Group();
    rotationRig.rotation.y = rotationY.current;
    rotationRigRef.current = rotationRig;
    scene.add(rotationRig);

    rebuildFit();

    const render = () => {
      if (!activeRef.current) {
        // Stop scheduling entirely instead of waking up every frame just to
        // bail — the `active` effect restarts the loop when it flips back on.
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(render);
      if (autoRotateRef.current) {
        rotationY.current += 0.004;
        rotationRig.rotation.y = rotationY.current;
      }

      const { pitch, yaw } = tiltOffsetRef.current;
      const zoomFactor = zoomRef.current;
      if (pitch !== 0 || yaw !== 0 || zoomFactor !== 1) {
        const basePos = cameraBasePositionRef.current;
        const baseLookAt = cameraBaseLookAtRef.current;
        const scratchOffset = scratchOffsetRef.current;
        const scratchSpherical = scratchSphericalRef.current;
        scratchOffset.subVectors(basePos, baseLookAt);
        scratchSpherical.setFromVector3(scratchOffset);
        scratchSpherical.theta += yaw;
        scratchSpherical.phi = THREE.MathUtils.clamp(scratchSpherical.phi - pitch, 0.2, Math.PI - 0.2);
        scratchSpherical.radius /= Math.max(0.2, zoomFactor);
        scratchOffset.setFromSpherical(scratchSpherical);
        camera.position.copy(scratchOffset).add(baseLookAt);
        camera.lookAt(baseLookAt);
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    renderLoopRef.current = render;
    render();
  };

  return (
    <View style={style} {...panResponder.panHandlers}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  gl: { flex: 1 },
});
