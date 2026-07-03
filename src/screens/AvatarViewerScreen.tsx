import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { useBodyStore } from '../store/useBodyStore';
import { useWardrobeStore } from '../store/useWardrobeStore';
import { AvatarScene } from '../three/AvatarScene';
import { GarmentFitSummary } from '../three/garmentBuilder';
import { Button } from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'AvatarViewer'>;

export function AvatarViewerScreen({ navigation }: Props) {
  const body = useBodyStore((s) => s.measurements);
  const garments = useWardrobeStore((s) => s.garments);
  const selectedId = useWardrobeStore((s) => s.selectedGarmentId);
  const selectGarment = useWardrobeStore((s) => s.selectGarment);
  const [fitSummaries, setFitSummaries] = useState<GarmentFitSummary[]>([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const isFocused = useIsFocused();

  const selectedGarment = garments.find((g) => g.id === selectedId) ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.sceneWrap}>
        <AvatarScene
          body={body}
          garment={selectedGarment}
          active={isFocused}
          autoRotate={autoRotate}
          onFitSummaries={setFitSummaries}
          style={{ flex: 1 }}
        />
        <Text style={styles.hint}>Döndürmek için sürükle</Text>
        <Pressable style={styles.rotateToggle} onPress={() => setAutoRotate((v) => !v)}>
          <Text style={styles.rotateToggleText}>{autoRotate ? '⏸ Döndürmeyi durdur' : '▶ Otomatik döndür'}</Text>
        </Pressable>
      </View>

      {fitSummaries.length > 0 && (
        <View style={styles.fitRow}>
          {fitSummaries.map((s) => (
            <View key={s.label} style={[styles.fitBadge, { borderColor: s.fit.color }]}>
              <Text style={[styles.fitBadgeValue, { color: s.fit.color }]}>{s.label}</Text>
              <Text style={styles.fitBadgeLabel}>{s.fit.label}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView horizontal style={styles.garmentPicker} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing(2) }}>
        <Pressable
          style={[styles.garmentChip, !selectedGarment && styles.garmentChipActive]}
          onPress={() => selectGarment(null)}
        >
          <Text style={styles.garmentChipText}>Kıyafetsiz</Text>
        </Pressable>
        {garments.map((g) => (
          <Pressable
            key={g.id}
            style={[styles.garmentChip, selectedId === g.id && styles.garmentChipActive]}
            onPress={() => selectGarment(g.id)}
          >
            <View style={[styles.dot, { backgroundColor: g.color }]} />
            <Text style={styles.garmentChipText}>{g.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Gardıroba ekle" variant="secondary" onPress={() => navigation.navigate('GarmentEditor')} style={{ flex: 1 }} />
        <Button title="AR ile dene" onPress={() => navigation.navigate('ARView')} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sceneWrap: { flex: 1 },
  hint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    color: colors.textMuted,
    fontSize: 12,
    backgroundColor: '#00000080',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rotateToggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#00000080',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rotateToggleText: { color: colors.text, fontSize: 12 },
  fitRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing(2), paddingTop: 10 },
  fitBadge: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  fitBadgeValue: { fontSize: 12, fontWeight: '700' },
  fitBadgeLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  garmentPicker: { flexGrow: 0, marginTop: spacing(2) },
  garmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  garmentChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  garmentChipText: { color: colors.text, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  footer: { flexDirection: 'row', gap: 10, padding: spacing(2) },
});
