import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Unit } from '../types/measurements';

interface SettingsState {
  unit: Unit;
  aiEndpointUrl: string;
  aiApiToken: string;
  setUnit: (u: Unit) => void;
  setAiEndpointUrl: (v: string) => void;
  setAiApiToken: (v: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'cm',
      aiEndpointUrl: '',
      aiApiToken: '',
      setUnit: (unit) => set({ unit }),
      setAiEndpointUrl: (aiEndpointUrl) => set({ aiEndpointUrl }),
      setAiApiToken: (aiApiToken) => set({ aiApiToken }),
    }),
    {
      name: 'fitting-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
