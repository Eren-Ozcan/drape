import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useSettingsStore } from '../store/useSettingsStore';
import { useBodyStore } from '../store/useBodyStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({}: Props) {
  const unit = useSettingsStore((s) => s.unit);
  const setUnit = useSettingsStore((s) => s.setUnit);
  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const setAiProvider = useSettingsStore((s) => s.setAiProvider);
  const aiEndpointUrl = useSettingsStore((s) => s.aiEndpointUrl);
  const setAiEndpointUrl = useSettingsStore((s) => s.setAiEndpointUrl);
  const aiApiToken = useSettingsStore((s) => s.aiApiToken);
  const setAiApiToken = useSettingsStore((s) => s.setAiApiToken);
  const resetBody = useBodyStore((s) => s.reset);

  const [endpointDraft, setEndpointDraft] = useState(aiEndpointUrl);
  const [tokenDraft, setTokenDraft] = useState(aiApiToken);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing(2) }}>
      <Text style={styles.title}>Ayarlar</Text>

      <Card style={{ marginBottom: spacing(2) }}>
        <Text style={styles.cardTitle}>Birim</Text>
        <View style={styles.rowBtns}>
          <Button title="cm" variant={unit === 'cm' ? 'primary' : 'secondary'} onPress={() => setUnit('cm')} style={{ flex: 1 }} />
          <Button title="inch" variant={unit === 'inch' ? 'primary' : 'secondary'} onPress={() => setUnit('inch')} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card style={{ marginBottom: spacing(2) }}>
        <Text style={styles.cardTitle}>AI fotogerçekçi önizleme</Text>
        <Text style={styles.body}>
          3D avatar ve AR modları bu ayardan bağımsız, API gerektirmeden her zaman çalışır. Bu sadece fotogerçekçi
          önizleme içindir.
        </Text>
        <View style={styles.rowBtns}>
          <Button
            title="Ücretsiz demo"
            variant={aiProvider === 'hf-space' ? 'primary' : 'secondary'}
            onPress={() => setAiProvider('hf-space')}
            style={{ flex: 1 }}
          />
          <Button
            title="Kendi servisim"
            variant={aiProvider === 'custom' ? 'primary' : 'secondary'}
            onPress={() => setAiProvider('custom')}
            style={{ flex: 1 }}
          />
        </View>

        {aiProvider === 'hf-space' ? (
          <>
            <Text style={[styles.body, { marginTop: 12 }]}>
              Ekstra kurulum gerekmez — herkese açık, ücretsiz bir Hugging Face demosu (IDM-VTON) kullanılır.
              Paylaşılan günlük kotaya bağlı olduğu için yoğun saatlerde yavaş olabilir veya kota dolduğunda geçici
              olarak çalışmayabilir. Kendi Hugging Face token'ını girersen (huggingface.co/settings/tokens) günlük
              kotan artar; boş bırakabilirsin.
            </Text>
            <Text style={styles.label}>Hugging Face Token (opsiyonel)</Text>
            <TextInput
              style={styles.input}
              value={tokenDraft}
              onChangeText={setTokenDraft}
              onEndEditing={() => setAiApiToken(tokenDraft.trim())}
              onBlur={() => setAiApiToken(tokenDraft.trim())}
              placeholder="hf_..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </>
        ) : (
          <>
            <Text style={[styles.body, { marginTop: 12 }]}>
              Kendi Replicate / Hugging Face Inference Endpoint / benzeri bir sanal deneme (virtual try-on)
              servisin varsa, adresini ve varsa token'ını buraya gir. Boş bırakırsan AI önizleme sekmesi devre
              dışı kalır.
            </Text>
            <Text style={styles.label}>Endpoint URL</Text>
            <TextInput
              style={styles.input}
              value={endpointDraft}
              onChangeText={setEndpointDraft}
              onEndEditing={() => setAiEndpointUrl(endpointDraft.trim())}
              onBlur={() => setAiEndpointUrl(endpointDraft.trim())}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.label}>API Token (opsiyonel)</Text>
            <TextInput
              style={styles.input}
              value={tokenDraft}
              onChangeText={setTokenDraft}
              onEndEditing={() => setAiApiToken(tokenDraft.trim())}
              onBlur={() => setAiApiToken(tokenDraft.trim())}
              placeholder="hf_... veya r8_..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Verileri sıfırla</Text>
        <Text style={styles.body}>Vücut ölçülerini varsayılana döndürür. Gardırop etkilenmez.</Text>
        <Button title="Vücut ölçülerini sıfırla" variant="secondary" onPress={resetBody} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginBottom: spacing(2) },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  body: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  rowBtns: { flexDirection: 'row', gap: 10 },
});
