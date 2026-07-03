import React from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useWardrobeStore } from '../store/useWardrobeStore';
import { Garment } from '../types/measurements';

type Props = NativeStackScreenProps<RootStackParamList, 'Wardrobe'>;

const CATEGORY_LABEL: Record<Garment['category'], string> = {
  tshirt: 'Tişört',
  hoodie: 'Hoodie',
  pants: 'Pantolon',
  shirt: 'Gömlek',
};

export function WardrobeScreen({ navigation }: Props) {
  const garments = useWardrobeStore((s) => s.garments);
  const selectedId = useWardrobeStore((s) => s.selectedGarmentId);
  const selectGarment = useWardrobeStore((s) => s.selectGarment);
  const removeGarment = useWardrobeStore((s) => s.removeGarment);

  const confirmRemove = (garment: Garment) => {
    Alert.alert('Kıyafeti sil', `"${garment.name}" gardıroptan kaldırılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => removeGarment(garment.id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={{ padding: spacing(2), gap: 12 }}
        data={garments}
        keyExtractor={(g) => g.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Henüz kıyafet eklemedin. Sağ alttaki butonla başla.</Text>
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => {
              selectGarment(item.id);
              navigation.navigate('AvatarViewer');
            }}
            style={selectedId === item.id ? styles.selectedCard : undefined}
          >
            <View style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: item.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.category}>{CATEGORY_LABEL[item.category]}</Text>
              </View>
              <Pressable onPress={() => navigation.navigate('GarmentEditor', { garmentId: item.id })} hitSlop={8}>
                <Text style={styles.link}>Düzenle</Text>
              </Pressable>
              <Pressable onPress={() => confirmRemove(item)} hitSlop={8}>
                <Text style={[styles.link, { color: colors.danger }]}>Sil</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
      <View style={styles.footer}>
        <Button title="+ Yeni kıyafet" onPress={() => navigation.navigate('GarmentEditor')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  category: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  selectedCard: { borderColor: colors.primary },
  footer: { padding: spacing(2), borderTopWidth: 1, borderTopColor: colors.border },
});
