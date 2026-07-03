import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { MeasurementField } from '../components/MeasurementField';
import { Button } from '../components/Button';
import { useBodyStore } from '../store/useBodyStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { BODY_MEASUREMENT_FIELDS, Gender } from '../types/measurements';

type Props = NativeStackScreenProps<RootStackParamList, 'BodyMeasurements'>;

const GENDER_OPTIONS: Array<{ key: Gender; label: string }> = [
  { key: 'female', label: 'Kadın' },
  { key: 'male', label: 'Erkek' },
  { key: 'unisex', label: 'Unisex' },
];

export function BodyMeasurementsScreen({ navigation }: Props) {
  const measurements = useBodyStore((s) => s.measurements);
  const setMeasurements = useBodyStore((s) => s.setMeasurements);
  const unit = useSettingsStore((s) => s.unit);
  const setUnit = useSettingsStore((s) => s.setUnit);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing(2) }}>
        <Text style={styles.title}>Vücut ölçülerin</Text>
        <Text style={styles.subtitle}>
          Ölçüm alırken mezür'ü çok sıkmadan, ince kıyafetle veya iç çamaşırıyla ölçmen en doğru sonucu verir.
        </Text>

        <View style={styles.unitToggle}>
          <Button
            title="cm"
            variant={unit === 'cm' ? 'primary' : 'secondary'}
            onPress={() => setUnit('cm')}
            style={{ flex: 1 }}
          />
          <Button
            title="inch"
            variant={unit === 'inch' ? 'primary' : 'secondary'}
            onPress={() => setUnit('inch')}
            style={{ flex: 1 }}
          />
        </View>

        <Text style={styles.sectionLabel}>Vücut tipi</Text>
        <Text style={styles.sectionHint}>
          Sadece 3D avatarın ölçülen noktalar arasındaki silüet eğrisini inceltir; ölçtüğün çevre değerlerini
          değiştirmez.
        </Text>
        <View style={styles.unitToggle}>
          {GENDER_OPTIONS.map((g) => (
            <Button
              key={g.key}
              title={g.label}
              variant={measurements.gender === g.key ? 'primary' : 'secondary'}
              onPress={() => setMeasurements({ gender: g.key })}
              style={{ flex: 1 }}
            />
          ))}
        </View>

        <View style={styles.form}>
          {BODY_MEASUREMENT_FIELDS.map((f) => (
            <MeasurementField
              key={f.key}
              label={f.label}
              hint={f.hint}
              unit={unit}
              kind={f.key === 'weightKg' ? 'weight' : 'length'}
              min={f.min}
              max={f.max}
              valueCm={(measurements[f.key] as number) ?? 0}
              onChangeCm={(cm) => setMeasurements({ [f.key]: cm } as any)}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Kaydet ve 3D avatarı gör" onPress={() => navigation.navigate('AvatarViewer')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 6, marginBottom: spacing(2), lineHeight: 18 },
  unitToggle: { flexDirection: 'row', gap: 10, marginBottom: spacing(2) },
  sectionLabel: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  sectionHint: { color: colors.textMuted, fontSize: 12, marginBottom: 10, lineHeight: 16 },
  form: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  footer: { padding: spacing(2), borderTopWidth: 1, borderTopColor: colors.border },
});
