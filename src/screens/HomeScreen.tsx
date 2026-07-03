import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing } from '../theme';
import { useBodyStore } from '../store/useBodyStore';
import { useWardrobeStore } from '../store/useWardrobeStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const hasCustom = useBodyStore((s) => s.hasCustomMeasurements);
  const garments = useWardrobeStore((s) => s.garments);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing(2), gap: spacing(2) }}>
      <Text style={styles.title}>Fitting</Text>
      <Text style={styles.subtitle}>
        Ölçülerini gir, gardırobunu oluştur, 3D avatar ve AR üzerinde kıyafetlerin nasıl duracağını gör.
      </Text>

      <Card>
        <Text style={styles.cardTitle}>1. Vücut ölçülerin</Text>
        <Text style={styles.cardBody}>
          {hasCustom ? 'Ölçülerin kayıtlı.' : 'Henüz ölçü girmedin, varsayılan değerler kullanılıyor.'}
        </Text>
        <View style={styles.rowBtns}>
          <Button title="Elle gir" variant="secondary" onPress={() => navigation.navigate('BodyMeasurements')} style={{ flex: 1 }} />
          <Button title="Fotoğraftan çıkar" onPress={() => navigation.navigate('PhotoMeasurement')} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>2. Kıyafet gardırobu</Text>
        <Text style={styles.cardBody}>
          {garments.length > 0 ? `${garments.length} kıyafet kayıtlı.` : 'Henüz kıyafet eklemedin.'}
        </Text>
        <View style={styles.rowBtns}>
          <Button title="Gardırobu aç" variant="secondary" onPress={() => navigation.navigate('Wardrobe')} style={{ flex: 1 }} />
          <Button title="Yeni kıyafet ekle" onPress={() => navigation.navigate('GarmentEditor')} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>3. Nasıl duruyor?</Text>
        <Text style={styles.cardBody}>3D avatar üzerinde döndürerek incele ya da kamerayla AR modunda dene.</Text>
        <View style={styles.rowBtns}>
          <Button title="3D Avatar" variant="secondary" onPress={() => navigation.navigate('AvatarViewer')} style={{ flex: 1 }} />
          <Button title="AR ile dene" onPress={() => navigation.navigate('ARView')} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>4. Fotogerçekçi önizleme (AI)</Text>
        <Text style={styles.cardBody}>Fotoğrafın üzerine kıyafeti yapay zekayla giydirerek gerçekçi bir görsel üret.</Text>
        <Button title="AI önizleme" variant="secondary" onPress={() => navigation.navigate('AIPreview')} />
      </Card>

      <Button title="Ayarlar" variant="ghost" onPress={() => navigation.navigate('Settings')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: spacing(2) },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  cardBody: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
  rowBtns: { flexDirection: 'row', gap: 10 },
});
