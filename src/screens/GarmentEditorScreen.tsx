import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Pressable, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { Button } from '../components/Button';
import { MeasurementField } from '../components/MeasurementField';
import { useWardrobeStore } from '../store/useWardrobeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  BOTTOM_FIELDS,
  Garment,
  GarmentCategory,
  GarmentMeasurementsBottom,
  GarmentMeasurementsTop,
  TOP_FIELDS,
} from '../types/measurements';
import { generateId } from '../lib/id';
import { persistPickedImage, deletePersistedImage } from '../lib/imageUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'GarmentEditor'>;

const CATEGORIES: { key: GarmentCategory; label: string; kind: 'top' | 'bottom' }[] = [
  { key: 'tshirt', label: 'Tişört', kind: 'top' },
  { key: 'hoodie', label: 'Hoodie', kind: 'top' },
  { key: 'shirt', label: 'Gömlek', kind: 'top' },
  { key: 'pants', label: 'Pantolon', kind: 'bottom' },
];

const COLOR_PRESETS = ['#1c1f26', '#f2f3f5', '#5b8def', '#d92d20', '#12b76a', '#f79009', '#7a5af8', '#8a5a44'];

const DEFAULT_TOP: GarmentMeasurementsTop = { chestCm: 104, lengthCm: 70, shoulderCm: 46, sleeveCm: 22 };
const DEFAULT_BOTTOM: GarmentMeasurementsBottom = { waistCm: 84, hipCm: 102, inseamCm: 80, legOpeningCm: 18 };

export function GarmentEditorScreen({ navigation, route }: Props) {
  const garmentId = route.params?.garmentId;
  const existing = useWardrobeStore((s) => s.garments.find((g) => g.id === garmentId));
  const addGarment = useWardrobeStore((s) => s.addGarment);
  const updateGarment = useWardrobeStore((s) => s.updateGarment);
  const unit = useSettingsStore((s) => s.unit);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<GarmentCategory>(existing?.category ?? 'tshirt');
  const [color, setColor] = useState(existing?.color ?? COLOR_PRESETS[0]);
  const [top, setTop] = useState<GarmentMeasurementsTop>(existing?.top ?? DEFAULT_TOP);
  const [bottom, setBottom] = useState<GarmentMeasurementsBottom>(existing?.bottom ?? DEFAULT_BOTTOM);
  const [imageUri, setImageUri] = useState<string | undefined>(existing?.imageUri);

  const kind = useMemo(() => CATEGORIES.find((c) => c.key === category)?.kind ?? 'top', [category]);

  const pickGarmentPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ['images'] });
    if (!result.canceled && result.assets?.[0]) {
      const persisted = await persistPickedImage(result.assets[0].uri, 'garment');
      await deletePersistedImage(imageUri);
      setImageUri(persisted);
    }
  };

  const save = () => {
    const garment: Garment = {
      id: existing?.id ?? generateId(),
      name: name.trim() || CATEGORIES.find((c) => c.key === category)!.label,
      category,
      color,
      top: kind === 'top' ? top : undefined,
      bottom: kind === 'bottom' ? bottom : undefined,
      createdAt: existing?.createdAt ?? Date.now(),
      imageUri,
    };
    if (existing) {
      updateGarment(existing.id, garment);
    } else {
      addGarment(garment);
    }
    // Return to wherever this screen was opened from (Wardrobe, or the
    // "Gardıroba ekle" shortcut on the avatar viewer) instead of always
    // forcing a jump to Wardrobe.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Wardrobe');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing(2) }}>
        <Text style={styles.title}>{existing ? 'Kıyafeti düzenle' : 'Yeni kıyafet'}</Text>

        <Text style={styles.label}>İsim</Text>
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder="Örn. Beyaz oversize tişört"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Kategori</Text>
        <View style={styles.chipsRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[styles.chip, category === c.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Renk</Text>
        <View style={styles.chipsRow}>
          {COLOR_PRESETS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]}
            />
          ))}
        </View>

        <Text style={styles.label}>Kıyafet fotoğrafı (opsiyonel, AI önizleme için)</Text>
        <Pressable style={styles.photoPicker} onPress={pickGarmentPhoto}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.photoPreview} />
          ) : (
            <Text style={styles.photoPickerText}>+ Ürün fotoğrafı ekle</Text>
          )}
        </Pressable>

        <Text style={[styles.label, { marginTop: spacing(2) }]}>Ölçüler</Text>
        <View style={styles.form}>
          {kind === 'top'
            ? TOP_FIELDS.map((f) => (
                <MeasurementField
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  unit={unit}
                  min={f.min}
                  max={f.max}
                  valueCm={top[f.key]}
                  onChangeCm={(cm) => setTop((prev) => ({ ...prev, [f.key]: cm }))}
                />
              ))
            : BOTTOM_FIELDS.map((f) => (
                <MeasurementField
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  unit={unit}
                  min={f.min}
                  max={f.max}
                  valueCm={bottom[f.key]}
                  onChangeCm={(cm) => setBottom((prev) => ({ ...prev, [f.key]: cm }))}
                />
              ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Kaydet" onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: spacing(2) },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  textInput: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: spacing(2),
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing(2) },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.primary },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: colors.primary },
  photoPicker: {
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
    overflow: 'hidden',
  },
  photoPickerText: { color: colors.textMuted, fontSize: 13 },
  photoPreview: { width: '100%', height: '100%' },
  form: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  footer: { padding: spacing(2), borderTopWidth: 1, borderTopColor: colors.border },
});
