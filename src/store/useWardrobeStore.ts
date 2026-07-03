import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Garment } from '../types/measurements';
import { deletePersistedImage } from '../lib/imageUtils';

interface WardrobeState {
  garments: Garment[];
  selectedGarmentId: string | null;
  addGarment: (g: Garment) => void;
  updateGarment: (id: string, patch: Partial<Garment>) => void;
  removeGarment: (id: string) => void;
  selectGarment: (id: string | null) => void;
}

export const useWardrobeStore = create<WardrobeState>()(
  persist(
    (set) => ({
      garments: [],
      selectedGarmentId: null,
      addGarment: (g) =>
        set((state) => ({ garments: [g, ...state.garments], selectedGarmentId: g.id })),
      updateGarment: (id, patch) =>
        set((state) => ({
          garments: state.garments.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      removeGarment: (id) => {
        const garment = useWardrobeStore.getState().garments.find((g) => g.id === id);
        deletePersistedImage(garment?.imageUri);
        set((state) => ({
          garments: state.garments.filter((g) => g.id !== id),
          selectedGarmentId: state.selectedGarmentId === id ? null : state.selectedGarmentId,
        }));
      },
      selectGarment: (id) => set({ selectedGarmentId: id }),
    }),
    {
      name: 'fitting-wardrobe-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
