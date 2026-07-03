import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useBodyStore } from '../store/useBodyStore';
import { useWardrobeStore } from '../store/useWardrobeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { requestVirtualTryOn } from '../lib/aiTryOn';
import { persistPickedImage, deletePersistedImage } from '../lib/imageUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'AIPreview'>;

export function AIPreviewScreen({ navigation }: Props) {
  const frontPhotoUri = useBodyStore((s) => s.frontPhotoUri);
  const setPhotos = useBodyStore((s) => s.setPhotos);
  const garments = useWardrobeStore((s) => s.garments);
  const selectedId = useWardrobeStore((s) => s.selectedGarmentId);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const aiEndpointUrl = useSettingsStore((s) => s.aiEndpointUrl);
  const aiApiToken = useSettingsStore((s) => s.aiApiToken);

  const selectedGarment = garments.find((g) => g.id === selectedId) ?? null;
  const [personUri, setPersonUri] = useState<string | null>(frontPhotoUri);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickPersonPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ['images'] });
    if (!result.canceled && result.assets?.[0]) {
      const persistedUri = await persistPickedImage(result.assets[0].uri, 'body-front');
      await deletePersistedImage(frontPhotoUri);
      setPersonUri(persistedUri);
      setPhotos(persistedUri, null);
    }
  };

  const configured = aiProvider === 'hf-space' || !!aiEndpointUrl;

  const generate = async () => {
    if (!personUri || !selectedGarment?.imageUri) return;
    setLoading(true);
    setError(null);
    setResultUri(null);
    try {
      const dataUri = await requestVirtualTryOn({
        provider: aiProvider,
        endpointUrl: aiEndpointUrl,
        apiToken: aiApiToken || null,
        personImageUri: personUri,
        garmentImageUri: selectedGarment.imageUri,
        garmentCategory: selectedGarment.category,
      });
      setResultUri(dataUri);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!configured) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>AI fotogerçekçi önizleme</Text>
        <Text style={styles.body}>
          Bu özellik henüz ayarlanmadı. Kullanmak için kendi sanal deneme (virtual try-on) servisinin adresini
          Ayarlar'dan girmelisin — ücretsiz, sıfır kurulumlu evrensel bir servis olmadığından bu adım gerekli.
          Bunu yapmadan da 3D avatar ve AR modları tam olarak çalışır.
        </Text>
        <Button title="Ayarlara git" onPress={() => navigation.navigate('Settings')} />
        <Button title="Bunun yerine 3D avatarı gör" variant="ghost" onPress={() => navigation.navigate('AvatarViewer')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing(2) }}>
      <Text style={styles.title}>AI fotogerçekçi önizleme</Text>
      <Text style={styles.body}>
        {aiProvider === 'hf-space'
          ? 'Deneysel özellik: ücretsiz, paylaşılan bir Hugging Face demosu kullanılıyor. Yoğunluğa göre yavaş olabilir veya günlük kota dolduğunda geçici olarak çalışmayabilir.'
          : 'Deneysel özellik: sonuç, ayarladığın servisin kalitesine bağlıdır.'}
      </Text>

      <Card style={{ marginBottom: spacing(2) }}>
        <Text style={styles.cardTitle}>1. Fotoğrafın</Text>
        <Pressable style={styles.photoPicker} onPress={pickPersonPhoto}>
          {personUri ? <Image source={{ uri: personUri }} style={styles.photoPreview} /> : <Text style={styles.photoPickerText}>+ Fotoğraf seç</Text>}
        </Pressable>
      </Card>

      <Card style={{ marginBottom: spacing(2) }}>
        <Text style={styles.cardTitle}>2. Kıyafet</Text>
        {selectedGarment ? (
          <View style={styles.row}>
            {selectedGarment.imageUri ? (
              <Image source={{ uri: selectedGarment.imageUri }} style={styles.garmentThumb} />
            ) : (
              <View style={[styles.garmentThumb, { backgroundColor: selectedGarment.color }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.garmentName}>{selectedGarment.name}</Text>
              {!selectedGarment.imageUri && (
                <Text style={styles.warning}>
                  Bu kıyafetin fotoğrafı yok. AI önizleme için gardırop düzenlemeden bir ürün fotoğrafı ekle.
                </Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.body}>Önce gardırobundan bir kıyafet seç.</Text>
        )}
        <Button title="Gardırobu aç" variant="secondary" onPress={() => navigation.navigate('Wardrobe')} style={{ marginTop: 10 }} />
      </Card>

      <Button
        title={loading ? 'Oluşturuluyor…' : 'Fotogerçekçi görsel üret'}
        onPress={generate}
        disabled={loading || !personUri || !selectedGarment?.imageUri}
      />

      {loading && <ActivityIndicator style={{ marginTop: spacing(2) }} color={colors.primary} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {resultUri && (
        <Card style={{ marginTop: spacing(2) }}>
          <Text style={styles.cardTitle}>Sonuç</Text>
          <Image source={{ uri: resultUri }} style={styles.resultImage} resizeMode="contain" />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing(3), gap: spacing(2) },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: spacing(2), textAlign: 'left' },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  photoPicker: {
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPickerText: { color: colors.textMuted, fontSize: 13 },
  photoPreview: { width: '100%', height: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  garmentThumb: { width: 56, height: 56, borderRadius: 10 },
  garmentName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  warning: { color: '#f79009', fontSize: 11, marginTop: 4, lineHeight: 15 },
  error: { color: colors.danger, marginTop: 12, fontSize: 13 },
  resultImage: { width: '100%', height: 400, borderRadius: 12, backgroundColor: colors.surfaceAlt },
});
