import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { colors } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { BodyMeasurementsScreen } from '../screens/BodyMeasurementsScreen';
import { PhotoMeasurementScreen } from '../screens/PhotoMeasurementScreen';
import { WardrobeScreen } from '../screens/WardrobeScreen';
import { GarmentEditorScreen } from '../screens/GarmentEditorScreen';
import { AvatarViewerScreen } from '../screens/AvatarViewerScreen';
import { ARViewScreen } from '../screens/ARViewScreen';
import { AIPreviewScreen } from '../screens/AIPreviewScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Fitting' }} />
        <Stack.Screen name="BodyMeasurements" component={BodyMeasurementsScreen} options={{ title: 'Vücut ölçüleri' }} />
        <Stack.Screen name="PhotoMeasurement" component={PhotoMeasurementScreen} options={{ title: 'Fotoğraftan ölçü' }} />
        <Stack.Screen name="Wardrobe" component={WardrobeScreen} options={{ title: 'Gardırop' }} />
        <Stack.Screen name="GarmentEditor" component={GarmentEditorScreen} options={{ title: 'Kıyafet' }} />
        <Stack.Screen name="AvatarViewer" component={AvatarViewerScreen} options={{ title: '3D Avatar' }} />
        <Stack.Screen name="ARView" component={ARViewScreen} options={{ title: 'AR Önizleme', headerShown: false }} />
        <Stack.Screen name="AIPreview" component={AIPreviewScreen} options={{ title: 'AI Önizleme' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ayarlar' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
