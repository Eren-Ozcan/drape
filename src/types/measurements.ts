export type Unit = 'cm' | 'inch';

// Only used to nudge the *silhouette curve* between actual measured points
// (e.g. how sharply the torso lathe swings from waist to hip) — it never
// overrides a measured circumference itself, since those are always more
// precise than any preset.
export type Gender = 'female' | 'male' | 'unisex';

// All stored measurements are always in centimeters internally.
// The UI converts to/from inches only at the input/display boundary.
export interface BodyMeasurements {
  heightCm: number;
  weightKg?: number;
  gender: Gender;
  neckCm: number;
  chestCm: number;
  waistCm: number;
  hipCm: number;
  shoulderWidthCm: number;
  armLengthCm: number;
  inseamCm: number;
  thighCm: number;
}

export const BODY_MEASUREMENT_FIELDS: Array<{
  key: keyof BodyMeasurements;
  label: string;
  hint: string;
  min: number;
  max: number;
}> = [
  { key: 'heightCm', label: 'Boy', hint: 'Ayakkabısız boy', min: 100, max: 230 },
  { key: 'weightKg', label: 'Kilo (opsiyonel)', hint: 'Referans bilgisi; 3D model diğer ölçülerinden şekillenir', min: 30, max: 200 },
  { key: 'neckCm', label: 'Boyun çevresi', hint: 'Boynun en kalın yerinden', min: 25, max: 55 },
  { key: 'chestCm', label: 'Göğüs çevresi', hint: 'Göğsün en geniş yerinden', min: 60, max: 160 },
  { key: 'waistCm', label: 'Bel çevresi', hint: 'Göbek deliği hizasından', min: 50, max: 160 },
  { key: 'hipCm', label: 'Kalça çevresi', hint: 'Kalçanın en geniş yerinden', min: 60, max: 170 },
  { key: 'shoulderWidthCm', label: 'Omuz genişliği', hint: 'Omuz uçtan uca', min: 30, max: 60 },
  { key: 'armLengthCm', label: 'Kol boyu', hint: 'Omuzdan bilek kemiğine', min: 40, max: 90 },
  { key: 'inseamCm', label: 'Bacak içi (inseam)', hint: 'Kasıktan bilek kemiğine', min: 55, max: 100 },
  { key: 'thighCm', label: 'Uyluk çevresi', hint: 'Bacağın en geniş yerinden', min: 30, max: 90 },
];

export type GarmentCategory = 'tshirt' | 'hoodie' | 'pants' | 'shirt';

export interface GarmentMeasurementsTop {
  chestCm: number; // garment flat chest width x2 in practice, but we store as full circumference-equivalent
  lengthCm: number; // shoulder seam to hem
  shoulderCm: number;
  sleeveCm: number;
}

export interface GarmentMeasurementsBottom {
  waistCm: number;
  hipCm: number;
  inseamCm: number;
  legOpeningCm: number;
}

export interface Garment {
  id: string;
  name: string;
  category: GarmentCategory;
  color: string;
  top?: GarmentMeasurementsTop;
  bottom?: GarmentMeasurementsBottom;
  createdAt: number;
  // flatlay/product photo of the garment, used only by the optional AI
  // photorealistic preview (not required for the 3D/AR viewer)
  imageUri?: string;
}

export const TOP_FIELDS: Array<{ key: keyof GarmentMeasurementsTop; label: string; hint: string; min: number; max: number }> = [
  { key: 'chestCm', label: 'Göğüs genişliği', hint: 'Koltuk altından koltuk altına x2', min: 60, max: 170 },
  { key: 'lengthCm', label: 'Boy', hint: 'Omuz dikişinden ete kadar', min: 40, max: 100 },
  { key: 'shoulderCm', label: 'Omuz genişliği', hint: 'Omuz dikişi uçtan uca', min: 30, max: 65 },
  { key: 'sleeveCm', label: 'Kol boyu', hint: 'Omuz dikişinden kol ucuna', min: 15, max: 70 },
];

export const BOTTOM_FIELDS: Array<{ key: keyof GarmentMeasurementsBottom; label: string; hint: string; min: number; max: number }> = [
  { key: 'waistCm', label: 'Bel genişliği', hint: 'Yatık ölçümde bel x2', min: 50, max: 160 },
  { key: 'hipCm', label: 'Kalça genişliği', hint: 'Yatık ölçümde kalça x2', min: 60, max: 170 },
  { key: 'inseamCm', label: 'Paça içi (inseam)', hint: 'Ayak arasından paça ucuna', min: 50, max: 100 },
  { key: 'legOpeningCm', label: 'Paça genişliği', hint: 'Paça ağzı genişliği', min: 12, max: 40 },
];

// Common shape for any garment-vs-body comparison badge (girth fit or
// length/style), so the UI doesn't need to know which kind produced it.
export interface Rating {
  label: string;
  color: string;
  deltaCm: number;
  deltaPct: number;
}

export type FitLevel = 'very_tight' | 'tight' | 'fitted' | 'regular' | 'loose' | 'very_loose';

export interface FitResult extends Rating {
  level: FitLevel;
}

export type LengthLevel = 'short' | 'regular' | 'long';

export interface LengthResult extends Rating {
  level: LengthLevel;
}
