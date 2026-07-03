import React, { PropsWithChildren } from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface Props {
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: PropsWithChildren<Props>) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
