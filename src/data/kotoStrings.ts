import { KotoStringData, Song } from '../types/koto';

/**
 * 13 Strings of Koto (Hirajoshi / 平調子 - 壱越 D基音)
 * Frequencies match standard Japanese music education curriculum:
 * 一: D3 (146.83 Hz)
 * 二: G3 (196.00 Hz)
 * 三: A3 (220.00 Hz)
 * 四: Bb3 (233.08 Hz)
 * 五: D4 (293.66 Hz)
 * 六: Eb4 (311.13 Hz)
 * 七: G4 (392.00 Hz)
 * 八: A4 (440.00 Hz)
 * 九: Bb4 (466.16 Hz)
 * 十: D5 (587.33 Hz)
 * 斗: Eb5 (622.25 Hz)
 * 為: G5 (783.99 Hz)
 * 巾: A5 (880.00 Hz)
 */
export const KOTO_STRINGS: KotoStringData[] = [
  {
    id: 1,
    kanji: '一',
    doremi: 'レ',
    westernNote: 'D3',
    westernPitch: 'D',
    frequency: 146.83,
    keyBindDesktop: '1',
    keyBindSub: 'A',
    bridgePositionPercent: 22,
    stringThicknessPx: 3.2,
  },
  {
    id: 2,
    kanji: '二',
    doremi: 'ソ',
    westernNote: 'G3',
    westernPitch: 'G',
    frequency: 196.00,
    keyBindDesktop: '2',
    keyBindSub: 'S',
    bridgePositionPercent: 27,
    stringThicknessPx: 3.0,
  },
  {
    id: 3,
    kanji: '三',
    doremi: 'ラ',
    westernNote: 'A3',
    westernPitch: 'A',
    frequency: 220.00,
    keyBindDesktop: '3',
    keyBindSub: 'D',
    bridgePositionPercent: 32,
    stringThicknessPx: 2.8,
  },
  {
    id: 4,
    kanji: '四',
    doremi: 'シ♭',
    westernNote: 'B♭3',
    westernPitch: 'B♭',
    frequency: 233.08,
    keyBindDesktop: '4',
    keyBindSub: 'F',
    bridgePositionPercent: 36,
    stringThicknessPx: 2.6,
  },
  {
    id: 5,
    kanji: '五',
    doremi: 'レ',
    westernNote: 'D4',
    westernPitch: 'D',
    frequency: 293.66,
    keyBindDesktop: '5',
    keyBindSub: 'G',
    bridgePositionPercent: 41,
    stringThicknessPx: 2.4,
  },
  {
    id: 6,
    kanji: '六',
    doremi: 'ミ♭',
    westernNote: 'E♭4',
    westernPitch: 'E♭',
    frequency: 311.13,
    keyBindDesktop: '6',
    keyBindSub: 'H',
    bridgePositionPercent: 46,
    stringThicknessPx: 2.2,
  },
  {
    id: 7,
    kanji: '七',
    doremi: 'ソ',
    westernNote: 'G4',
    westernPitch: 'G',
    frequency: 392.00,
    keyBindDesktop: '7',
    keyBindSub: 'J',
    bridgePositionPercent: 51,
    stringThicknessPx: 2.0,
  },
  {
    id: 8,
    kanji: '八',
    doremi: 'ラ',
    westernNote: 'A4',
    westernPitch: 'A',
    frequency: 440.00,
    keyBindDesktop: '8',
    keyBindSub: 'K',
    bridgePositionPercent: 56,
    stringThicknessPx: 1.9,
  },
  {
    id: 9,
    kanji: '九',
    doremi: 'シ♭',
    westernNote: 'B♭4',
    westernPitch: 'B♭',
    frequency: 466.16,
    keyBindDesktop: '9',
    keyBindSub: 'L',
    bridgePositionPercent: 61,
    stringThicknessPx: 1.7,
  },
  {
    id: 10,
    kanji: '十',
    doremi: 'レ',
    westernNote: 'D5',
    westernPitch: 'D',
    frequency: 587.33,
    keyBindDesktop: '0',
    keyBindSub: ';',
    bridgePositionPercent: 66,
    stringThicknessPx: 1.5,
  },
  {
    id: 11,
    kanji: '斗',
    doremi: 'ミ♭',
    westernNote: 'E♭5',
    westernPitch: 'E♭',
    frequency: 622.25,
    keyBindDesktop: '-',
    keyBindSub: ':',
    bridgePositionPercent: 71,
    stringThicknessPx: 1.4,
  },
  {
    id: 12,
    kanji: '為',
    doremi: 'ソ',
    westernNote: 'G5',
    westernPitch: 'G',
    frequency: 783.99,
    keyBindDesktop: '^',
    keyBindSub: ']',
    bridgePositionPercent: 76,
    stringThicknessPx: 1.3,
  },
  {
    id: 13,
    kanji: '巾',
    doremi: 'ラ',
    westernNote: 'A5',
    westernPitch: 'A',
    frequency: 880.00,
    keyBindDesktop: '\\',
    keyBindSub: 'Z',
    bridgePositionPercent: 81,
    stringThicknessPx: 1.2,
  },
];

import { SAKURA_SONG, ROKUDAN_SONG } from './songs';
export { SAKURA_SONG };
export const ROKUDAN_INTRO = ROKUDAN_SONG;
