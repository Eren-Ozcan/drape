import { Unit } from '../types/measurements';

export function cmToInch(cm: number): number {
  return cm / 2.54;
}

export function inchToCm(inch: number): number {
  return inch * 2.54;
}

export function formatLength(cm: number, unit: Unit): string {
  if (unit === 'inch') return `${cmToInch(cm).toFixed(1)}"`;
  return `${cm.toFixed(1)} cm`;
}

export function displayValue(cm: number, unit: Unit): number {
  return unit === 'inch' ? Number(cmToInch(cm).toFixed(1)) : Number(cm.toFixed(1));
}

export function toCm(value: number, unit: Unit): number {
  return unit === 'inch' ? inchToCm(value) : value;
}
