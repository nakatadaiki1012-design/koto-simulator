/**
 * Procedural Acoustic Impulse Response Generator for Koto Sound Engine
 * Simulates distinct acoustic environments using Web Audio ConvolverNode:
 * - 'studio': Intimate, controlled recording studio / tea ceremony room (録音スタジオ)
 * - 'traditional_hall': Traditional wooden Noh theater / Japanese concert hall (能舞台・伝統和室)
 * - 'temple': Grand Buddhist temple hall / sanctuary (大本堂・伽藍)
 */

export type ReverbEnvironment = 'off' | 'studio' | 'traditional_hall' | 'temple';

export interface ReverbOption {
  id: ReverbEnvironment;
  label: string;
  labelEn: string;
  description: string;
  wetLevel: number;
}

export const REVERB_ENVIRONMENTS: ReverbOption[] = [
  {
    id: 'off',
    label: '残響なし',
    labelEn: 'Dry / Off',
    description: '直接音のみのクリアで素朴な響き',
    wetLevel: 0.0,
  },
  {
    id: 'studio',
    label: 'スタジオ',
    labelEn: 'Studio',
    description: '録音ブース・小和室のタイトで明瞭なアコースティック残響',
    wetLevel: 0.16,
  },
  {
    id: 'traditional_hall',
    label: '能舞台',
    labelEn: 'Traditional Hall',
    description: '能舞台や伝統的な大和室の檜・畳が織りなす温かな木の響き',
    wetLevel: 0.25,
  },
  {
    id: 'temple',
    label: '大本堂',
    labelEn: 'Temple Sanctuary',
    description: '大寺院の堂内にどこまでも広がる壮大で幻想的なロングリバーブ',
    wetLevel: 0.34,
  },
];

export function createEnvironmentImpulseResponse(
  ctx: AudioContext,
  environment: ReverbEnvironment
): AudioBuffer | null {
  if (environment === 'off') {
    return null;
  }

  const sampleRate = ctx.sampleRate;
  let duration = 1.9;
  let decay = 2.4;
  let dampingFactor = 0.85;

  let earlyReflectionsL: Array<{ time: number; gain: number }> = [];
  let earlyReflectionsR: Array<{ time: number; gain: number }> = [];

  switch (environment) {
    case 'studio':
      duration = 0.75;
      decay = 4.6;
      dampingFactor = 0.72; // faster absorption
      earlyReflectionsL = [
        { time: 0.008, gain: 0.5 },
        { time: 0.018, gain: 0.35 },
        { time: 0.029, gain: 0.2 },
      ];
      earlyReflectionsR = [
        { time: 0.011, gain: 0.48 },
        { time: 0.022, gain: 0.32 },
        { time: 0.034, gain: 0.18 },
      ];
      break;

    case 'traditional_hall':
      duration = 2.0;
      decay = 2.3;
      dampingFactor = 0.86;
      earlyReflectionsL = [
        { time: 0.013, gain: 0.65 },
        { time: 0.026, gain: 0.45 },
        { time: 0.042, gain: 0.32 },
        { time: 0.065, gain: 0.22 },
      ];
      earlyReflectionsR = [
        { time: 0.016, gain: 0.62 },
        { time: 0.031, gain: 0.42 },
        { time: 0.048, gain: 0.28 },
        { time: 0.072, gain: 0.19 },
      ];
      break;

    case 'temple':
      duration = 3.5;
      decay = 1.5; // very slow decay
      dampingFactor = 0.94; // sustained high and mid air reflection
      earlyReflectionsL = [
        { time: 0.022, gain: 0.75 },
        { time: 0.048, gain: 0.55 },
        { time: 0.082, gain: 0.42 },
        { time: 0.125, gain: 0.32 },
        { time: 0.18, gain: 0.24 },
      ];
      earlyReflectionsR = [
        { time: 0.028, gain: 0.72 },
        { time: 0.054, gain: 0.52 },
        { time: 0.092, gain: 0.38 },
        { time: 0.142, gain: 0.28 },
        { time: 0.21, gain: 0.2 },
      ];
      break;
  }

  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  // Apply discrete early reflections
  for (const tap of earlyReflectionsL) {
    const idx = Math.floor(tap.time * sampleRate);
    if (idx < length) left[idx] += tap.gain;
  }
  for (const tap of earlyReflectionsR) {
    const idx = Math.floor(tap.time * sampleRate);
    if (idx < length) right[idx] += tap.gain;
  }

  // Generate smooth diffuse reverberation tail
  let prevL = 0;
  let prevR = 0;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = Math.exp(-t * decay);

    const noiseL = (Math.random() * 2 - 1) * env;
    const noiseR = (Math.random() * 2 - 1) * env;

    const currentDamping = dampingFactor - t * 0.35;
    prevL = prevL * currentDamping + noiseL * (1 - currentDamping);
    prevR = prevR * currentDamping + noiseR * (1 - currentDamping);

    left[i] += prevL * 0.45;
    right[i] += prevR * 0.45;
  }

  return impulse;
}
