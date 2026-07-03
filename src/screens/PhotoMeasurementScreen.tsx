import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MeasurementField } from '../components/MeasurementField';
import { useBodyStore } from '../store/useBodyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { detectPoseFromImageUri } from '../lib/poseEstimation';
import { estimateMeasurementsFromKeypoints, EstimationResult } from '../lib/anthropometry';
import { persistPickedImage, deletePersistedImage } from '../lib/imageUtils';
import { BODY_MEASUREMENT_FIELDS, BodyMeasurements } from '../types/measurements';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoMeasurement'>;

interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
}

export function PhotoMeasurementScreen({ navigation }: Props) {
  const currentMeasurements = useBodyStore((s) => s.measurements);
  const setMeasurements = useBodyStore((s) => s.setMeasurements);
  const setPhotos = useBodyStore((s) => s.setPhotos);
  const frontPhotoUri = useBodyStore((s) => s.frontPhotoUri);
  const unit = useSettingsStore((s) => s.unit);
  const windowWidth = useWindowDimensions().width;

  const [referenceHeightCm, setReferenceHeightCm] = useState(currentMeasurements.heightCm);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [keypointDots, setKeypointDots] = useState<Array<{ x: number; y: number; score: number }>>([]);
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayWidth = windowWidth - spacing(4);
  const displayHeight = photo ? (displayWidth * photo.height) / photo.width : 0;

  const pickFrom = async (source: 'camera' | 'library') => {
    setError(null);
    setEstimation(null);
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError('Kamera izni verilmedi.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Galeri izni verilmedi.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    }
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    const persistedUri = await persistPickedImage(a.uri, 'body-front');
    await deletePersistedImage(frontPhotoUri);
    setPhoto({ uri: persistedUri, width: a.width, height: a.height });
    setPhotos(persistedUri, null);
  };

  const runEstimate = async () => {
    if (!photo) return;
    setLoading(true);
    setError(null);
    try {
      const pose = await detectPoseFromImageUri(photo.uri);
      if (!pose) {
        setError('Fotoğrafta vücut algılanamadı. Tüm vücudun net göründüğü, aydınlık bir fotoğraf dene.');
        setLoading(false);
        return;
      }
      const dots = pose.rawKeypoints
        .filter((k) => (k.score ?? 0) > 0.3)
        .map((k) => ({ x: (k.x / pose.imageWidth) * displayWidth, y: (k.y / pose.imageHeight) * displayHeight, score: k.score ?? 0 }));
      setKeypointDots(dots);

      const est = estimateMeasurementsFromKeypoints(pose.keypoints, referenceHeightCm);
      setEstimation(est);
    } catch (e: any) {
      setError(`Poz tahmini başarısız oldu: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  const applyEstimation = () => {
    if (!estimation) return;
    setMeasurements(estimation.measurements);
    navigation.navigate('BodyMeasurements');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing(2) }}>
      <Text style={styles.title}>Fotoğraftan ölçü çıkar</Text>
      <Text style={styles.subtitle}>
        Tüm vücudunun göründüğü, aydınlık, önden çekilmiş bir fotoğraf kullan. Sonuçlar tahminidir; kaydetmeden önce
        kontrol et.
      </Text>

      <Card style={{ marginBottom: spacing(2) }}>
        <Text style={styles.label}>Gerçek boyun (referans ölçek için gerekli)</Text>
        <MeasurementField
          label="Boy"
          unit={unit}
          min={100}
          max={230}
          valueCm={referenceHeightCm}
          onChangeCm={setReferenceHeightCm}
        />
      </Card>

      <View style={styles.rowBtns}>
        <Button title="Kamerayla çek" onPress={() => pickFrom('camera')} style={{ flex: 1 }} />
        <Button title="Galeriden seç" variant="secondary" onPress={() => pickFrom('library')} style={{ flex: 1 }} />
      </View>

      {photo && (
        <View style={[styles.imageWrap, { width: displayWidth, height: displayHeight }]}>
          <Image source={{ uri: photo.uri }} style={{ width: displayWidth, height: displayHeight, borderRadius: 12 }} />
          {keypointDots.map((d, i) => (
            <View key={i} style={[styles.dot, { left: d.x - 4, top: d.y - 4, opacity: d.score }]} />
          ))}
        </View>
      )}

      {photo && (
        <Button
          title={loading ? 'Analiz ediliyor…' : 'Ölçüleri tahmin et'}
          onPress={runEstimate}
          disabled={loading}
          style={{ marginTop: spacing(2) }}
        />
      )}

      {loading && <ActivityIndicator style={{ marginTop: spacing(2) }} color={colors.primary} />}

      {error && <Text style={styles.error}>{error}</Text>}

      {estimation && estimation.estimatedFields.length > 0 && (
        <Card style={{ marginTop: spacing(2) }}>
          <Text style={styles.cardTitle}>Tahmini ölçüler</Text>
          {estimation.warnings.map((w, i) => (
            <Text key={i} style={styles.warning}>
              ⚠ {w}
            </Text>
          ))}
          <View style={{ marginTop: 10 }}>
            {BODY_MEASUREMENT_FIELDS.filter((f) => estimation.estimatedFields.includes(f.key)).map((f) => (
              <View key={f.key} style={styles.resultRow}>
                <Text style={styles.resultLabel}>{f.label}</Text>
                <Text style={styles.resultValue}>
                  {(estimation.measurements[f.key] as number)?.toFixed(1)} cm
                </Text>
              </View>
            ))}
          </View>
          <Button title="Bu ölçüleri kullan ve düzenle" onPress={applyEstimation} style={{ marginTop: spacing(2) }} />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 6, marginBottom: spacing(2), lineHeight: 18 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  rowBtns: { flexDirection: 'row', gap: 10, marginBottom: spacing(2) },
  imageWrap: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceAlt, marginBottom: 4 },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#39d98a',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  warning: { color: '#f79009', fontSize: 12, lineHeight: 16, marginBottom: 4 },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultLabel: { color: colors.text, fontSize: 14 },
  resultValue: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
