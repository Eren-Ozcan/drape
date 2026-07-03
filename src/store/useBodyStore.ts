import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BodyMeasurements } from '../types/measurements';
import { deletePersistedImage } from '../lib/imageUtils';

const DEFAULT_MEASUREMENTS: BodyMeasurements = {
  heightCm: 170,
  weightKg: 70,
  gender: 'unisex',
  neckCm: 38,
  chestCm: 96,
  waistCm: 82,
  hipCm: 98,
  shoulderWidthCm: 44,
  armLengthCm: 60,
  inseamCm: 78,
  thighCm: 54,
};

interface BodyState {
  measurements: BodyMeasurements;
  hasCustomMeasurements: boolean;
  frontPhotoUri: string | null;
  sidePhotoUri: string | null;
  setMeasurements: (m: Partial<BodyMeasurements>) => void;
  setPhotos: (front: string | null, side: string | null) => void;
  reset: () => void;
}

export const useBodyStore = create<BodyState>()(
  persist(
    (set) => ({
      measurements: DEFAULT_MEASUREMENTS,
      hasCustomMeasurements: false,
      frontPhotoUri: null,
      sidePhotoUri: null,
      setMeasurements: (m) =>
        set((state) => ({
          measurements: { ...state.measurements, ...m },
          hasCustomMeasurements: true,
        })),
      setPhotos: (front, side) => set({ frontPhotoUri: front, sidePhotoUri: side }),
      reset: () => {
        const { frontPhotoUri, sidePhotoUri } = useBodyStore.getState();
        deletePersistedImage(frontPhotoUri);
        deletePersistedImage(sidePhotoUri);
        set({
          measurements: DEFAULT_MEASUREMENTS,
          hasCustomMeasurements: false,
          frontPhotoUri: null,
          sidePhotoUri: null,
        });
      },
    }),
    {
      name: 'fitting-body-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
