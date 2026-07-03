import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { Unit } from '../types/measurements';
import { displayValue, toCm } from '../lib/units';

interface Props {
  label: string;
  hint?: string;
  valueCm: number;
  unit: Unit;
  onChangeCm: (cm: number) => void;
  min?: number;
  max?: number;
  // Weight isn't a length — it must never go through the cm/inch conversion
  // that every other field here uses, or it renders nonsense like "27.6 in".
  kind?: 'length' | 'weight';
}

export function MeasurementField({ label, hint, valueCm, unit, onChangeCm, min, max, kind = 'length' }: Props) {
  const effectiveUnit: Unit = kind === 'weight' ? 'cm' : unit; // 'cm' here just means "don't convert"
  const [text, setText] = useState(String(displayValue(valueCm, effectiveUnit)));
  const [focused, setFocused] = useState(false);

  React.useEffect(() => {
    if (!focused) setText(String(displayValue(valueCm, effectiveUnit)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, valueCm]);

  const commit = (raw: string) => {
    const num = parseFloat(raw.replace(',', '.'));
    if (Number.isNaN(num) || num <= 0) {
      setText(String(displayValue(valueCm, effectiveUnit)));
      return;
    }
    let cm = kind === 'weight' ? num : toCm(num, effectiveUnit);
    if (min !== undefined) cm = Math.max(min, cm);
    if (max !== undefined) cm = Math.min(max, cm);
    onChangeCm(cm);
    setText(String(displayValue(cm, effectiveUnit)));
  };

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={text}
          keyboardType="decimal-pad"
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onEndEditing={() => {
            setFocused(false);
            commit(text);
          }}
          onBlur={() => {
            setFocused(false);
            commit(text);
          }}
        />
        <Text style={styles.unit}>{kind === 'weight' ? 'kg' : effectiveUnit === 'cm' ? 'cm' : 'in'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { color: colors.text, fontSize: 15, fontWeight: '500' },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    color: colors.text,
    fontSize: 15,
    minWidth: 56,
    textAlign: 'right',
    paddingVertical: 8,
  },
  unit: { color: colors.textMuted, fontSize: 12, marginLeft: 4 },
});
