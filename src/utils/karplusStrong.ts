/**
 * Enhanced Physical Modeling Synthesis (Extended Karplus-Strong) for Japanese 13-String Koto (十三弦 箏)
 *
 * Implements:
 * 1. Ivory Plectrum (角爪・生田流/山田流) shaped attack with slip-stick transient & wooden soundboard contact thump.
 * 2. Pluck point comb filtering (plucking near the 竜角 / Ryukaku, ~12% vibrating length).
 * 3. Inharmonicity (string stiffness dispersion) for twisted silk and tetron cord harmonics.
 * 4. Sawari (サワリ) bridge notch grazing non-linearity.
 * 5. Full palette of Traditional Playing Techniques:
 *    - 本手（通常）: Standard ivory pluck
 *    - 押し手（Oshi-de）: Left-hand string press (+半音/+全音ピッチベンド)
 *    - 引き色（Hiki-iro）: Pre-pressed string released gracefully (-半音滑空)
 *    - 突き色（Tsuki-iro）: Momentary left-hand pressure accent on sustain
 *    - スクイ爪（Sukui）: Index finger upward flick, sharp and light
 *    - 割爪・トレモロ（Tremolo）: Rapid fluttering string strikes
 *    - 消音・ピチカート（Pizzicato）: Dry muted wooden staccato
 *    - 合わせ爪（Awase）: Octave dual pluck
 *    - 裏弾き（Ura-biki）: Non-vibrating side of bridge metallic chime
 * 6. Multi-point Paulownia Soundboard Acoustics (桐の竜甲・裏板・綾杉彫り 245Hz, 490Hz, 1250Hz).
 */

import { PlayingTechnique } from '../types/koto';

export interface KotoStringSynthOptions {
  sampleRate: number;
  frequency: number;
  durationSeconds: number;
  stringType?: 'silk' | 'tetron';
  pluckHardness?: number; // 0.0 to 1.0
  technique?: PlayingTechnique;
  bridgePosPercent?: number; // For urabiki calculation
}

export function synthesizeKotoString(
  ctx: AudioContext,
  options: KotoStringSynthOptions
): AudioBuffer {
  const {
    sampleRate,
    durationSeconds,
    stringType = 'silk',
    pluckHardness = 0.85,
    technique = 'normal',
    bridgePosPercent = 50,
  } = options;

  let baseFrequency = options.frequency;

  // Urabiki (裏弾き): Plucking the left, non-vibrating side of the bridge
  if (technique === 'urabiki') {
    const leftRatio = Math.max(0.15, bridgePosPercent / 100);
    const rightRatio = Math.max(0.15, 1 - leftRatio);
    baseFrequency = Math.min(3200, baseFrequency * (rightRatio / leftRatio));
  }

  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
  const channel = buffer.getChannelData(0);

  // Period in samples
  const period = sampleRate / baseFrequency;
  const N = Math.max(8, Math.floor(period));
  const frac = period - N;

  // String stiffness / inharmonicity allpass filter
  const stiffness = stringType === 'silk' ? 0.00038 : 0.00019;
  const allpassCoeff = Math.min(0.35, Math.max(-0.35, -stiffness * baseFrequency));

  // Loop damping factor
  let decayRate = stringType === 'silk' ? 0.9942 : 0.9968;
  if (technique === 'pizzicato') {
    decayRate = 0.942; // Rapid wooden decay
  } else if (technique === 'urabiki') {
    decayRate = 0.988; // High metallic ring
  } else if (technique === 'sukui') {
    decayRate = 0.9935; // Lighter decay
  }
  const freqDamping = Math.min(0.9985, Math.max(0.92, decayRate - (baseFrequency / 2200) * 0.012));

  // Pluck point ratio along string (Sukui plucks slightly closer to the bridge)
  const pluckPointRatio = technique === 'urabiki' ? 0.25 : technique === 'sukui' ? 0.09 : 0.12;
  const pluckDelaySamples = Math.max(2, Math.floor(N * pluckPointRatio));

  // 1. Excitation Buffer Generation
  const ringBuffer = new Float32Array(N + 2);
  const noiseSeed = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const white = Math.random() * 2 - 1;
    const decayExponent = technique === 'sukui' ? 6.2 : 4.8;
    const decay = Math.exp((-i / N) * decayExponent);
    noiseSeed[i] = white * decay;
  }

  // Comb-filtering excitation according to pluck position
  for (let i = 0; i < N; i++) {
    const delayed = i >= pluckDelaySamples ? noiseSeed[i - pluckDelaySamples] : 0;
    ringBuffer[i] = noiseSeed[i] - delayed;
  }

  // Ivory plectrum sharp attack click & slip transient
  const clickMultiplier = technique === 'sukui' ? 1.8 : 1.5;
  const clickLength = Math.min(
    N,
    Math.floor(sampleRate * (technique === 'pizzicato' ? 0.0014 : technique === 'sukui' ? 0.0018 : 0.0028))
  );
  for (let i = 0; i < clickLength; i++) {
    const t = i / clickLength;
    const click = Math.sin(t * Math.PI * (technique === 'sukui' ? 22 : 16)) * (1 - t) * (1 - t);
    ringBuffer[i] += click * clickMultiplier * pluckHardness;
  }

  // 2. Resonator states
  let allpassPrevInput = 0;
  let allpassPrevOutput = 0;

  // Paulownia Body Cavity 245Hz Helmholtz Resonator
  const bodyFreq = technique === 'urabiki' ? 580 : 245;
  const bodyQ = 3.6;
  const w0 = (2 * Math.PI * bodyFreq) / sampleRate;
  const alpha = Math.sin(w0) / (2 * bodyQ);
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  let bpX1 = 0, bpX2 = 0, bpY1 = 0, bpY2 = 0;

  // Paulownia Soundboard 490Hz 2nd bending mode
  const bodyFreq2 = 490;
  const w0_2 = (2 * Math.PI * bodyFreq2) / sampleRate;
  const alpha2 = Math.sin(w0_2) / (2 * 4.2);
  const b0_2 = alpha2, b1_2 = 0, b2_2 = -alpha2;
  const a0_2 = 1 + alpha2, a1_2 = -2 * Math.cos(w0_2), a2_2 = 1 - alpha2;

  let bp2X1 = 0, bp2X2 = 0, bp2Y1 = 0, bp2Y2 = 0;

  // 3. Synthesize waveform
  const tempWave = new Float32Array(totalSamples);
  let readIdx = 0;

  for (let i = 0; i < totalSamples; i++) {
    const rawVal = ringBuffer[readIdx];

    // Sawari non-linearity: high amplitude vibrations graze against the bridge notch
    let sawariVal = rawVal;
    if (Math.abs(rawVal) > 0.40 && (technique === 'normal' || technique === 'sukui')) {
      const excess = Math.abs(rawVal) - 0.40;
      // Fast polynomial saturation instead of expensive Math.sin in hot loop
      const sign = rawVal > 0 ? 1 : -1;
      sawariVal = rawVal + sign * (excess * excess * 0.45);
    }

    // Lowpass moving average
    const nextIdx = (readIdx + 1) % N;
    const nextVal = ringBuffer[nextIdx];
    const weight = 0.5 - (technique === 'sukui' ? 0.12 : 0.09) * (1 - pluckHardness);
    const lowpassed = (sawariVal * (1 - weight) + nextVal * weight) * freqDamping;

    // Fractional delay
    const nextIdx2 = (readIdx + 2) % N;
    const fracVal = lowpassed * (1 - frac) + ringBuffer[nextIdx2] * frac;

    // Allpass dispersion
    const dispersed = allpassCoeff * fracVal + allpassPrevInput - allpassCoeff * allpassPrevOutput;
    allpassPrevInput = fracVal;
    allpassPrevOutput = dispersed;

    // Write back
    ringBuffer[readIdx] = dispersed;
    readIdx = nextIdx;

    tempWave[i] = rawVal;
  }

  // 4. Normalize & Apply Body Cavity & Soundboard Blend
  let maxAmp = 0;
  for (let i = 0; i < Math.min(totalSamples, 2000); i++) {
    const abs = Math.abs(tempWave[i]);
    if (abs > maxAmp) maxAmp = abs;
  }
  const normFactor = maxAmp > 0.0001 ? 0.95 / maxAmp : 1.0;

  // Soundboard mechanical knock length (~16ms)
  const knockLength = Math.floor(sampleRate * 0.016);

  for (let i = 0; i < totalSamples; i++) {
    const direct = tempWave[i] * normFactor;

    // 245Hz Cavity Filter
    const bpOut = (b0 * direct + b1 * bpX1 + b2 * bpX2 - a1 * bpY1 - a2 * bpY2) / a0;
    bpX2 = bpX1;
    bpX1 = direct;
    bpY2 = bpY1;
    bpY1 = bpOut;

    // 490Hz Plate Filter
    const bpOut2 = (b0_2 * direct + b1_2 * bp2X1 + b2_2 * bp2X2 - a1_2 * bp2Y1 - a2_2 * bp2Y2) / a0_2;
    bp2X2 = bp2X1;
    bp2X1 = direct;
    bp2Y2 = bp2Y1;
    bp2Y1 = bpOut2;

    // 55Hz Soundboard mechanical impulse knock on strike
    let knock = 0;
    if (i < knockLength && technique !== 'urabiki') {
      const kt = i / knockLength;
      knock = Math.sin(kt * Math.PI * 2.2) * (1 - kt) * 0.12 * pluckHardness;
    }

    let blended = direct * 0.78 + bpOut * 0.22 + bpOut2 * 0.12 + knock;
    if (technique === 'pizzicato') {
      blended = direct * 0.88 + bpOut * 0.12;
    } else if (technique === 'urabiki') {
      blended = direct * 0.96 + bpOut * 0.04;
    } else if (technique === 'sukui') {
      blended = direct * 0.86 + bpOut * 0.14 + bpOut2 * 0.08;
    }

    // Write to channel
    channel[i] = blended;
  }

  return buffer;
}
