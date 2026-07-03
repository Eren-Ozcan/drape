import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Unit } from '../types/measurements';
import { AiProvider } from '../lib/aiTryOn';

interface SettingsState {
  unit: Unit;
  aiProvider: AiProvider;
  aiEndpointUrl: string;
  aiApiToken: string;
  setUnit: (u: Unit) => void;
  setAiProvider: (p: AiProvider) => void;
  setAiEndpointUrl: (v: string) => void;
  setAiApiToken: (v: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'cm',
      aiProvider: 'hf-space',
      aiEndpointUrl: '',
      aiApiToken: '',
      setUnit: (unit) => set({ unit }),
      setAiProvider: (aiProvider) => set({ aiProvider }),
      setAiEndpointUrl: (aiEndpointUrl) => set({ aiEndpointUrl }),
      setAiApiToken: (aiApiToken) => set({ aiApiToken }),
    }),
    {
      name: 'fitting-settings-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
