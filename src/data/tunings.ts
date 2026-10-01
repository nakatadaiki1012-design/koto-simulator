import { KotoTuning, KotoStringData } from '../types/koto';

const KANJI_STRINGS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '斗', '為', '巾'];
const KEY_DESKTOP = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '^', '\\'];
const KEY_SUB = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', ':', ']', 'Z'];
const STRING_THICKNESS = [3.2, 3.0, 2.8, 2.6, 2.4, 2.2, 2.0, 1.9, 1.7, 1.5, 1.4, 1.3, 1.2];

/**
 * Calculates realistic physical bridge position on Koto (竜角=100%, 雲角=0%)
 * based on string frequency physics.
 */
function calcBridgePos(freq: number): number {
  const baseFreq = 146.83; // D3
  // Realistic physical arch accounting for tapered string gauge
  const lengthRatio = Math.pow(baseFreq / freq, 0.62);
  const vibratingLength = 78 * lengthRatio;
  return Math.min(88, Math.max(18, 100 - vibratingLength));
}

function createStringData(
  id: number,
  doremi: string,
  westernNote: string,
  westernPitch: string,
  frequency: number
): KotoStringData {
  return {
    id,
    kanji: KANJI_STRINGS[id - 1],
    doremi,
    westernNote,
    westernPitch,
    frequency,
    keyBindDesktop: KEY_DESKTOP[id - 1],
    keyBindSub: KEY_SUB[id - 1],
    bridgePositionPercent: parseFloat(calcBridgePos(frequency).toFixed(1)),
    stringThicknessPx: STRING_THICKNESS[id - 1],
  };
}

/**
 * 1. 平調子 (Hirajoshi / 壱越 D基音)
 * 最も基本となる江戸箏曲の調弦。陰旋法（都節音階）の幽玄で情感豊かな響き。
 */
export const HIRAJOSHI: KotoTuning = {
  id: 'hirajoshi',
  name: '平調子',
  reading: 'ひらぢょうし',
  description: '近世箏曲の最も代表的な基本調弦法。半音を含む哀愁と雅やかな日本古来の情緒を醸し出します。',
  mood: '幽玄・雅・哀愁',
  baseKey: 'D',
  strings: [
    createStringData(1, 'レ', 'D3', 'D', 146.83),
    createStringData(2, 'ソ', 'G3', 'G', 196.00),
    createStringData(3, 'ラ', 'A3', 'A', 220.00),
    createStringData(4, 'シ♭', 'B♭3', 'B♭', 233.08),
    createStringData(5, 'レ', 'D4', 'D', 293.66),
    createStringData(6, 'ミ♭', 'E♭4', 'E♭', 311.13),
    createStringData(7, 'ソ', 'G4', 'G', 392.00),
    createStringData(8, 'ラ', 'A4', 'A', 440.00),
    createStringData(9, 'シ♭', 'B♭4', 'B♭', 466.16),
    createStringData(10, 'レ', 'D5', 'D', 587.33),
    createStringData(11, 'ミ♭', 'E♭5', 'E♭', 622.25),
    createStringData(12, 'ソ', 'G5', 'G', 783.99),
    createStringData(13, 'ラ', 'A5', 'A', 880.00),
  ],
};

/**
 * 2. 雲井調子 (Kumoi-joshi)
 * 平調子の三・八・巾を半音下げた調弦。「千鳥の曲」や宮城道雄作品などで名高い、澄んだ気品と詩情。
 */
export const KUMOI_JOSHI: KotoTuning = {
  id: 'kumoi',
  name: '雲井調子',
  reading: 'くもいぢょうし',
  description: '平調子の三・八・巾の琴柱を下げた優美で抒情的な調弦。「千鳥の曲」などの名曲で親しまれます。',
  mood: '清澄・詩情・静寂',
  baseKey: 'D',
  strings: [
    createStringData(1, 'レ', 'D3', 'D', 146.83),
    createStringData(2, 'ソ', 'G3', 'G', 196.00),
    createStringData(3, 'ラ♭', 'A♭3', 'A♭', 207.65),
    createStringData(4, 'ド', 'C4', 'C', 261.63),
    createStringData(5, 'レ', 'D4', 'D', 293.66),
    createStringData(6, 'ミ♭', 'E♭4', 'E♭', 311.13),
    createStringData(7, 'ソ', 'G4', 'G', 392.00),
    createStringData(8, 'ラ♭', 'A♭4', 'A♭', 415.30),
    createStringData(9, 'ド', 'C5', 'C', 523.25),
    createStringData(10, 'レ', 'D5', 'D', 587.33),
    createStringData(11, 'ミ♭', 'E♭5', 'E♭', 622.25),
    createStringData(12, 'ソ', 'G5', 'G', 783.99),
    createStringData(13, 'ラ♭', 'A♭5', 'A♭', 830.61),
  ],
};

/**
 * 3. 乃木調子 / 陽旋法 (Nogi-joshi / Yo-sen)
 * 半音を含まない明るい五音音階（民謡・田舎節）。晴れやかで祝祭的な響き。
 */
export const NOGI_JOSHI: KotoTuning = {
  id: 'nogi',
  name: '乃木調子（陽旋）',
  reading: 'のぎぢょうし',
  description: '半音を含まない日本の明るい民謡音階（陽旋法）。祝典や祝い事の楽曲に好んで用いられます。',
  mood: '晴朗・祝祭・素朴',
  baseKey: 'D',
  strings: [
    createStringData(1, 'レ', 'D3', 'D', 146.83),
    createStringData(2, 'ソ', 'G3', 'G', 196.00),
    createStringData(3, 'ラ', 'A3', 'A', 220.00),
    createStringData(4, 'シ', 'B3', 'B', 246.94),
    createStringData(5, 'レ', 'D4', 'D', 293.66),
    createStringData(6, 'ミ', 'E4', 'E', 329.63),
    createStringData(7, 'ソ', 'G4', 'G', 392.00),
    createStringData(8, 'ラ', 'A4', 'A', 440.00),
    createStringData(9, 'シ', 'B4', 'B', 493.88),
    createStringData(10, 'レ', 'D5', 'D', 587.33),
    createStringData(11, 'ミ', 'E5', 'E', 659.25),
    createStringData(12, 'ソ', 'G5', 'G', 783.99),
    createStringData(13, 'ラ', 'A5', 'A', 880.00),
  ],
};

/**
 * 4. 中空調子 (Nakasora-joshi)
 * 平調子の四・九を上げて六・斗を下げた瞑想的な調弦。
 */
export const NAKASORA_JOSHI: KotoTuning = {
  id: 'nakasora',
  name: '中空調子',
  reading: 'なかぞらぢょうし',
  description: '天空を漂うような浮遊感と透明感を持つ調弦。古典の独奏曲や瞑想的な作品に使われます。',
  mood: '瞑想・浮遊感・幻想',
  baseKey: 'D',
  strings: [
    createStringData(1, 'レ', 'D3', 'D', 146.83),
    createStringData(2, 'ソ', 'G3', 'G', 196.00),
    createStringData(3, 'ラ', 'A3', 'A', 220.00),
    createStringData(4, 'ド', 'C4', 'C', 261.63),
    createStringData(5, 'レ', 'D4', 'D', 293.66),
    createStringData(6, 'ファ', 'F4', 'F', 349.23),
    createStringData(7, 'ソ', 'G4', 'G', 392.00),
    createStringData(8, 'ラ', 'A4', 'A', 440.00),
    createStringData(9, 'ド', 'C5', 'C', 523.25),
    createStringData(10, 'レ', 'D5', 'D', 587.33),
    createStringData(11, 'ファ', 'F5', 'F', 698.46),
    createStringData(12, 'ソ', 'G5', 'G', 783.99),
    createStringData(13, 'ラ', 'A5', 'A', 880.00),
  ],
};

/**
 * 5. 古今調子 (Kokin-joshi)
 * 明治新曲期に生み出された華やかで優美な近代調弦。
 */
export const KOKIN_JOSHI: KotoTuning = {
  id: 'kokin',
  name: '古今調子',
  reading: 'こきんぢょうし',
  description: '明治・大正期に発展した気品ある近代調弦。伝統と新しい響きの融合が美しい旋律を生みます。',
  mood: '典雅・流麗・近代邦楽',
  baseKey: 'D',
  strings: [
    createStringData(1, 'レ', 'D3', 'D', 146.83),
    createStringData(2, 'ソ', 'G3', 'G', 196.00),
    createStringData(3, 'ラ', 'A3', 'A', 220.00),
    createStringData(4, 'シ♭', 'B♭3', 'B♭', 233.08),
    createStringData(5, 'レ', 'D4', 'D', 293.66),
    createStringData(6, 'ファ', 'F4', 'F', 349.23),
    createStringData(7, 'ソ', 'G4', 'G', 392.00),
    createStringData(8, 'ラ', 'A4', 'A', 440.00),
    createStringData(9, 'シ♭', 'B♭4', 'B♭', 466.16),
    createStringData(10, 'レ', 'D5', 'D', 587.33),
    createStringData(11, 'ファ', 'F5', 'F', 698.46),
    createStringData(12, 'ソ', 'G5', 'G', 783.99),
    createStringData(13, 'ラ', 'A5', 'A', 880.00),
  ],
};

/**
 * 6. 楽調子 (Gaku-joshi / 雅楽・平調)
 * 雅楽（宮廷音楽）の伝統的な壱越調・平調の流れを汲む高貴な響き。
 */
export const GAKU_JOSHI: KotoTuning = {
  id: 'gaku',
  name: '楽調子（雅楽）',
  reading: 'がくぢょうし',
  description: '千年以上受け継がれる宮廷雅楽の平調に基づく古代調弦。厳かで高貴な響きが特徴です。',
  mood: '荘厳・悠久・宮廷雅楽',
  baseKey: 'D',
  strings: [
    createStringData(1, 'レ', 'D3', 'D', 146.83),
    createStringData(2, 'ソ', 'G3', 'G', 196.00),
    createStringData(3, 'ラ', 'A3', 'A', 220.00),
    createStringData(4, 'シ', 'B3', 'B', 246.94),
    createStringData(5, 'レ', 'D4', 'D', 293.66),
    createStringData(6, 'ミ', 'E4', 'E', 329.63),
    createStringData(7, 'ファ#', 'F#4', 'F#', 369.99),
    createStringData(8, 'ラ', 'A4', 'A', 440.00),
    createStringData(9, 'シ', 'B4', 'B', 493.88),
    createStringData(10, 'レ', 'D5', 'D', 587.33),
    createStringData(11, 'ミ', 'E5', 'E', 659.25),
    createStringData(12, 'ファ#', 'F#5', 'F#', 739.99),
    createStringData(13, 'ラ', 'A5', 'A', 880.00),
  ],
};

export const ALL_TUNINGS: KotoTuning[] = [
  HIRAJOSHI,
  KUMOI_JOSHI,
  NOGI_JOSHI,
  NAKASORA_JOSHI,
  KOKIN_JOSHI,
  GAKU_JOSHI,
];
