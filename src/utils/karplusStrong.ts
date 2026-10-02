/**
 * Physical Modeling Synthesis (Extended Karplus-Strong) for Japanese 13-String Koto (十三弦 箏)
 *
 * 安定性を最優先に作り直したバージョン:
 * - ループ利得は必ず 1 未満（減衰時間 T60 から計算）→ 音が暴走・無音化しない
 * - 分数遅延オールパスで正確なピッチ（全弦 ±数セント以内）
 * - 象牙の角爪らしいアタック（撥弦位置コムフィルタ + 硬さに応じたノイズ）
 * - 桐の胴鳴り（245Hz / 490Hz の安定なバンドパス）
 * - 軽いサワリ風サチュレーション（ループの外でかけるので安全）
 * - バッファ末尾のフェードアウトでプツッというノイズを防止
 */

import { PlayingTechnique } from '../types/koto';

export interface KotoStringSynthOptions {
  sampleRate: number;
  frequency: number;
  durationSeconds?: number; // 省略時は弦と奏法から自動計算
  stringType?: 'silk' | 'tetron';
  pluckHardness?: number; // 0.0 to 1.0
  technique?: PlayingTechnique;
  bridgePosPercent?: number; // For urabiki calculation
}

/** 余韻（音量が -60dB になるまでの秒数） */
export function getDecayTime(
  frequency: number,
  stringType: 'silk' | 'tetron' = 'silk',
  technique: PlayingTechnique = 'normal'
): number {
  if (technique === 'pizzicato') return 0.28;
  if (technique === 'urabiki') return 0.7;
  // 低い弦ほど長く響く（147Hz で約3.4秒 → 880Hz で約1.9秒）
  const octavesAbove = Math.log2(Math.max(60, frequency) / 147);
  let t60 = 3.4 - octavesAbove * 0.6;
  t60 = Math.max(1.4, Math.min(3.8, t60));
  if (stringType === 'tetron') t60 *= 1.3;
  if (technique === 'sukui') t60 *= 0.85;
  return t60;
}

/** 生成するバッファの長さ（秒） */
export function getSynthDuration(
  frequency: number,
  stringType: 'silk' | 'tetron' = 'silk',
  technique: PlayingTechnique = 'normal'
): number {
  const t60 = getDecayTime(frequency, stringType, technique);
  return Math.max(0.4, Math.min(4.5, t60 * 0.9));
}

export function synthesizeKotoString(
  ctx: AudioContext,
  options: KotoStringSynthOptions
): AudioBuffer {
  const {
    sampleRate,
    stringType = 'silk',
    pluckHardness = 0.85,
    technique = 'normal',
    bridgePosPercent = 50,
  } = options;

  let freq = options.frequency;

  // 裏弾き: 柱の左側（短い側）を弾くので高く金属的な音になる
  if (technique === 'urabiki') {
    const leftRatio = Math.max(0.15, bridgePosPercent / 100);
    const rightRatio = Math.max(0.15, 1 - leftRatio);
    freq = Math.min(2400, freq * (rightRatio / leftRatio));
  }
  freq = Math.max(40, Math.min(sampleRate / 8, freq));

  const durationSeconds =
    options.durationSeconds ?? getSynthDuration(options.frequency, stringType, technique);
  const totalSamples = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
  const out = buffer.getChannelData(0);

  // ---------- 1. ループの設定（ピッチと減衰） ----------
  // 低域通過フィルタ y = (1-w)x[n] + w x[n-1]  （遅延 w サンプル）
  // w が大きいほど柔らかい音。絹は柔らかめ、テトロンは明るめ。
  let w = stringType === 'silk' ? 0.42 : 0.34;
  if (technique === 'pizzicato') w = 0.5;
  else if (technique === 'sukui') w -= 0.06;
  else if (technique === 'urabiki') w = 0.3;
  w += (1 - pluckHardness) * 0.08;
  w = Math.max(0.2, Math.min(0.5, w));

  const period = sampleRate / freq; // ループ全体で必要な遅延（サンプル）
  // 整数遅延 N と分数遅延 d（オールパスで実現）に分ける。d は 0.1〜1.1 に保つ
  const N = Math.max(2, Math.floor(period - w - 0.1));
  const d = period - N - w;
  const apC = (1 - d) / (1 + d); // 一次オールパス係数（|apC|<1 なので安定）

  // T60 から 1 周あたりの減衰量を計算（必ず 1 未満）
  const t60 = getDecayTime(options.frequency, stringType, technique);
  const loopGain = Math.min(0.9995, Math.pow(10, -3 / (freq * t60)));

  // ---------- 2. 励振（爪で弾いた瞬間の形） ----------
  const excLen = N;
  const exc = new Float32Array(excLen);
  // 硬い爪ほど高域の多いノイズ
  const smooth = 0.15 + (1 - pluckHardness) * 0.6;
  let lp = 0;
  for (let i = 0; i < excLen; i++) {
    const white = Math.random() * 2 - 1;
    lp = lp + (1 - smooth) * (white - lp);
    exc[i] = lp;
  }
  // 平均を 0 に（直流成分があるとボコッとした音になる）
  let mean = 0;
  for (let i = 0; i < excLen; i++) mean += exc[i];
  mean /= excLen;
  for (let i = 0; i < excLen; i++) exc[i] -= mean;

  // 撥弦位置のコムフィルタ（竜角近く ≒ 弦長の 12%）
  const pluckRatio = technique === 'urabiki' ? 0.25 : technique === 'sukui' ? 0.09 : 0.12;
  const P = Math.max(1, Math.round(N * pluckRatio));
  const shaped = new Float32Array(excLen);
  for (let i = 0; i < excLen; i++) {
    shaped[i] = exc[i] - (i >= P ? exc[i - P] : 0);
  }

  // ---------- 3. 弦の振動を計算 ----------
  const raw = new Float32Array(totalSamples);
  const L = N + 2;
  const line = new Float32Array(L); // 遅延線（循環バッファ）
  let writeIdx = 0;
  let prevTap = 0;
  let apIn1 = 0;
  let apOut1 = 0;

  for (let n = 0; n < totalSamples; n++) {
    // N サンプル前の値
    const readIdx = (writeIdx - N + L * 4) % L;
    const tap = line[readIdx];

    // 低域通過 + 減衰
    const filtered = loopGain * ((1 - w) * tap + w * prevTap);
    prevTap = tap;

    // 分数遅延オールパス（ピッチの微調整）
    const ap = apC * filtered + apIn1 - apC * apOut1;
    apIn1 = filtered;
    apOut1 = ap;

    const y = ap + (n < excLen ? shaped[n] : 0);
    line[writeIdx] = y;
    writeIdx = (writeIdx + 1) % L;
    raw[n] = y;
  }

  // ---------- 4. 胴鳴り・アタック・仕上げ ----------
  const makeBandpass = (f0: number, q: number) => {
    const w0 = (2 * Math.PI * f0) / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;
    return {
      b0: alpha / a0,
      b2: -alpha / a0,
      a1: (-2 * Math.cos(w0)) / a0,
      a2: (1 - alpha) / a0,
      x1: 0, x2: 0, y1: 0, y2: 0,
    };
  };
  const runBp = (f: ReturnType<typeof makeBandpass>, x: number) => {
    const y = f.b0 * x + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
    f.x2 = f.x1; f.x1 = x; f.y2 = f.y1; f.y1 = y;
    return y;
  };
  const body1 = makeBandpass(technique === 'urabiki' ? 580 : 245, 3.6);
  const body2 = makeBandpass(490, 4.2);

  let bodyMix1 = 0.35;
  let bodyMix2 = 0.2;
  if (technique === 'pizzicato') { bodyMix1 = 0.5; bodyMix2 = 0.1; }
  else if (technique === 'urabiki') { bodyMix1 = 0.1; bodyMix2 = 0.05; }

  const knockLen = Math.floor(sampleRate * 0.018);
  const clickLen = Math.floor(sampleRate * (technique === 'pizzicato' ? 0.0015 : 0.0025));
  const sawariDrive = technique === 'normal' || technique === 'sukui' ? 1.6 : 1.0;
  const sawariNorm = Math.tanh(sawariDrive);

  // まずピークを測って正規化
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) peak = Math.max(peak, Math.abs(raw[i]));
  const norm = peak > 1e-6 ? 0.8 / peak : 0;

  const fadeLen = Math.min(totalSamples, Math.floor(sampleRate * 0.06));
  let outPeak = 0;

  for (let i = 0; i < totalSamples; i++) {
    const x = raw[i] * norm;
    let y = x + runBp(body1, x) * bodyMix1 + runBp(body2, x) * bodyMix2;

    // サワリ風のごく軽い歪み（ループ外なので安定）
    if (sawariDrive > 1) y = Math.tanh(y * sawariDrive) / sawariNorm;

    // 爪のカチッという音
    if (i < clickLen) {
      const t = i / clickLen;
      y += Math.sin(t * Math.PI * 14) * (1 - t) * (1 - t) * 0.25 * pluckHardness;
    }
    // 胴を叩いたような低いコツッ音
    if (i < knockLen && technique !== 'urabiki') {
      const t = i / knockLen;
      y += Math.sin(t * Math.PI * 2.2) * (1 - t) * 0.08 * pluckHardness;
    }

    // 最後はなめらかにフェードアウト（プツッ音防止）
    const fromEnd = totalSamples - 1 - i;
    if (fromEnd < fadeLen) y *= fromEnd / fadeLen;

    if (!isFinite(y)) y = 0;
    out[i] = y;
    outPeak = Math.max(outPeak, Math.abs(y));
  }

  // 最終ピークを 0.9 に揃える（クリップしない）
  if (outPeak > 0.9) {
    const s = 0.9 / outPeak;
    for (let i = 0; i < totalSamples; i++) out[i] *= s;
  }

  return buffer;
}
