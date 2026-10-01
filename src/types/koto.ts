export type LabelMode = 'kanji' | 'doremi' | 'western';

export type PlayingTechnique =
  | 'normal'     // 本手（通常撥弦）
  | 'oshide'     // 押し手（+半音ピッチベンド）
  | 'hikiiro'    // 引き色（押した状態から離して音程を下げる余韻技法）
  | 'tsukiiro'   // 突き色（弾いた直後に左手を軽く押してアクセントを加える）
  | 'sukui'      // スクイ爪（人差し指の爪の角で下からすくい上げる軽快な音）
  | 'tremolo'    // 割爪・トレモロ（素早い連続連打）
  | 'pizzicato'  // 消音・ピチカート（手のひらを当てて余韻を止めた短音）
  | 'awase'      // 合わせ爪（八度・和音の同時撥弦）
  | 'urabiki';   // 裏弾き（琴柱の左側を弾く高域金属共鳴音）

export interface KotoStringData {
  id: number; // 1 to 13
  kanji: string; // 一, 二, 三, ... 巾
  doremi: string; // レ, ソ, ラ, シ♭, ...
  westernNote: string; // D3, G3, A3, ...
  westernPitch: string; // D, G, A, Bb, ...
  frequency: number; // Hz
  keyBindDesktop: string; // Keyboard shortcut e.g. "1", "2", ...
  keyBindSub: string; // Alternate key (e.g. QWERTY letter)
  bridgePositionPercent: number; // Authentic physical location of 柱 (Ji) along the string (0 to 100%)
  stringThicknessPx: number; // Lower strings are thicker than high strings
}

export interface KotoTuning {
  id: string;
  name: string;
  reading: string;
  description: string;
  mood: string;
  baseKey: string;
  strings: KotoStringData[];
}

export interface PluckEvent {
  stringId: number;
  velocity?: number; // 0 to 1
  technique?: PlayingTechnique;
  originX?: number; // pluck point ratio
}

export interface SongNote {
  stringId: number;
  duration: number; // In beats (1 = 1 beat, 0.5 = half beat, 2 = 2 beats)
  lyric?: string;
  section?: string;
  technique?: PlayingTechnique;
}

export interface Song {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  bpm: number;
  tuningId: string; // e.g. 'hirajoshi' | 'kumoi'
  tuningName: string;
  difficulty: '入門' | '初級' | '中級' | '上級';
  notes: SongNote[];
}

export type GlowIntensity = 'off' | 'subtle' | 'vivid';
export type BridgeVisibility = 'full' | 'simplified' | 'hidden';

export interface VisualSettings {
  vibrationAnimation: boolean;
  glowIntensity: GlowIntensity;
  bridgeVisibility: BridgeVisibility;
}

export const DEFAULT_VISUAL_SETTINGS: VisualSettings = {
  vibrationAnimation: true,
  glowIntensity: 'vivid',
  bridgeVisibility: 'full',
};

