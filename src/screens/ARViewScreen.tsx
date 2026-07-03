import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { Button } from '../components/Button';
import { useBodyStore } from '../store/useBodyStore';
import { useWardrobeStore } from '../store/useWardrobeStore';
import { AvatarScene } from '../three/AvatarScene';

type Props = NativeStackScreenProps<RootStackParamList, 'ARView'>;

export function ARViewScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const body = useBodyStore((s) => s.measurements);
  const garments = useWardrobeStore((s) => s.garments);
  const selectedId = useWardrobeStore((s) => s.selectedGarmentId);
  const selectedGarment = garments.find((g) => g.id === selectedId) ?? null;
  const isFocused = useIsFocused();

  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const dragStartX = useRef(0);
  const pinchStartDistance = useRef<number | null>(null);
  const scaleAtPinchStart = useRef(1);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const touchDistance = (touches: Array<{ pageX: number; pageY: number }>) =>
    Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartX.current = offsetX;
        pinchStartDistance.current = null;
      },
      onPanResponderMove: (e, gesture) => {
        const touches = e.nativeEvent.touches;
        if (touches.length >= 2) {
          const dist = touchDistance(touches as any);
          if (pinchStartDistance.current === null) {
            pinchStartDistance.current = dist;
            scaleAtPinchStart.current = scaleRef.current;
          } else {
            const ratio = dist / pinchStartDistance.current;
            setScale(Math.min(2, Math.max(0.4, scaleAtPinchStart.current * ratio)));
          }
          return;
        }
        pinchStartDistance.current = null;
        setOffsetX(dragStartX.current + gesture.dx);
      },
    })
  ).current;

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permText}>Kıyafeti AR'da görüntülemek için kamera izni gerekiyor.</Text>
        <Button title="Kameraya izin ver" onPress={requestPermission} />
      </View>
    );
  }

  if (!selectedGarment) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permText}>Önce gardırobundan bir kıyafet seç.</Text>
        <Button title="Gardırobu aç" onPress={() => navigation.navigate('Wardrobe')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && <CameraView style={StyleSheet.absoluteFill} facing="back" />}
      <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
        <View style={{ flex: 1, transform: [{ translateX: offsetX }] }}>
          <AvatarScene
            body={body}
            garment={selectedGarment}
            active={isFocused}
            autoRotate={false}
            deviceStabilized={isFocused}
            zoom={scale}
            interactive={false}
            transparentBackground
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={styles.noteBar}>
        <Text style={styles.noteText}>
          Avatarı parmağınla konumlandır, iki parmakla yakınlaştır/uzaklaştır. Telefonu hafifçe oynattığında model
          sahnede sabit duruyormuş hissi verir (cihaz yönelimiyle stabilize edilir). Zemine kilitlenen tam
          ARKit/ARCore takibi değildir.
        </Text>
      </View>

      <View style={styles.scaleRow}>
        <Pressable style={styles.scaleBtn} onPress={() => setScale((s) => Math.max(0.4, s - 0.1))}>
          <Text style={styles.scaleBtnText}>-</Text>
        </Pressable>
        <Text style={styles.scaleLabel}>{Math.round(scale * 100)}%</Text>
        <Pressable style={styles.scaleBtn} onPress={() => setScale((s) => Math.min(2, s + 0.1))}>
          <Text style={styles.scaleBtnText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Button title="Geri" variant="secondary" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing(3), gap: spacing(2) },
  permText: { color: colors.text, fontSize: 15, textAlign: 'center' },
  noteBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: '#00000090',
    borderRadius: 10,
    padding: 10,
  },
  noteText: { color: colors.textMuted, fontSize: 11, lineHeight: 15 },
  scaleRow: {
    position: 'absolute',
    right: 12,
    top: '40%',
    backgroundColor: '#00000090',
    borderRadius: 20,
    padding: 6,
    alignItems: 'center',
    gap: 6,
  },
  scaleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  scaleLabel: { color: colors.text, fontSize: 11 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing(2) },
});
