import { FitLevel, FitResult, LengthLevel, LengthResult } from '../types/measurements';

// Compares a garment circumference/width measurement against the body's
// equivalent to classify how the garment will sit on the wearer.
// deltaCm = garment - body. Negative means the garment is smaller than the body.
export function classifyFit(garmentCm: number, bodyCm: number): FitResult {
  const deltaCm = garmentCm - bodyCm;
  const deltaPct = (deltaCm / bodyCm) * 100;

  let level: FitLevel;
  let label: string;
  let color: string;

  if (deltaPct < -4) {
    level = 'very_tight';
    label = 'Çok dar (zor sığar)';
    color = '#d92d20';
  } else if (deltaPct < 0) {
    level = 'tight';
    label = 'Dar / vücuda oturan';
    color = '#f79009';
  } else if (deltaPct < 6) {
    level = 'fitted';
    label = 'Tam kalıp';
    color = '#12b76a';
  } else if (deltaPct < 14) {
    level = 'regular';
    label = 'Rahat kalıp';
    color = '#2e90fa';
  } else if (deltaPct < 24) {
    level = 'loose';
    label = 'Bol';
    color = '#7a5af8';
  } else {
    level = 'very_loose';
    label = 'Çok bol / oversize';
    color = '#8a94a6';
  }

  return { level, label, color, deltaCm, deltaPct };
}

// classifyFit's tight/loose girth scale doesn't make sense for lengths (a
// short sleeve isn't "too tight", it's a short-sleeve style) — this reports
// style/coverage instead, comparing against the full limb length.
export function classifyLength(garmentCm: number, fullLimbCm: number, kind: 'sleeve' | 'inseam'): LengthResult {
  const deltaCm = garmentCm - fullLimbCm;
  const deltaPct = (deltaCm / fullLimbCm) * 100;

  let level: LengthLevel;
  let label: string;
  let color: string;

  if (deltaPct < -15) {
    level = 'short';
    label = kind === 'sleeve' ? 'Kısa kol' : 'Kısa boy';
    color = '#2e90fa';
  } else if (deltaPct <= 8) {
    level = 'regular';
    label = kind === 'sleeve' ? 'Tam boy kol' : 'Tam boy';
    color = '#12b76a';
  } else {
    level = 'long';
    label = kind === 'sleeve' ? 'Uzun kol' : 'Yığılan boy';
    color = '#7a5af8';
  }

  return { level, label, color, deltaCm, deltaPct };
}
