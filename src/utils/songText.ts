import { Song, SongNote } from '../types/koto';

/**
 * 「七 七 八ー」のような文字の楽譜と、アプリの曲データを相互に変換する。
 *
 * 書き方のルール（だれでも書けるように簡単にしている）
 * - 弦の名前: 一 二 三 四 五 六 七 八 九 十 斗 為 巾（数字 1〜13 でもよい）
 * - 1つの区切り（スペース・「、」・「・」）が1拍
 * - 「ー」を後ろに付けると1拍ずつ伸びる（例: 八ー = 2拍）
 * - 区切らずに続けて書くと1拍を分け合う（例: 八七 = 半拍ずつ）
 * - 弦名のすぐ後ろに「オ」を付けると押し手（例: 六オ）
 * - 「◯」「○」は休み（1拍）
 * - 1行が縦譜の1列（ひとまとまり）。「#」で始まる行はその後の区切りの名前
 */

const KANJI_TO_ID: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7,
  八: 8, 九: 9, 十: 10, 斗: 11, 為: 12, 巾: 13,
};
export const ID_TO_KANJI: Record<number, string> = Object.fromEntries(
  Object.entries(KANJI_TO_ID).map(([k, v]) => [v, k])
);

const EXTEND_CHARS = new Set(['ー', '-', '―', '〜', '~']);
const OSHI_CHARS = new Set(['オ', 'お']);
const REST_CHARS = new Set(['◯', '○', '〇', 'o', 'O']);

/** 休符は stringId 0 として扱う（弦は光らず、音も鳴らない） */
export const REST_STRING_ID = 0;

export interface ParseResult {
  notes: SongNote[];
  errors: string[];
}

export function parseSongText(text: string): ParseResult {
  const notes: SongNote[] = [];
  const errors: string[] = [];
  let pendingSection: string | undefined;
  let lineNo = 0;
  let columnNo = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    lineNo++;
    // 全角数字・半角カナなどをふつうの形にそろえる
    const line = rawLine.normalize('NFKC').trim();
    if (!line) continue;
    if (line.startsWith('#') || line.startsWith('＃')) {
      pendingSection = line.slice(1).trim() || undefined;
      continue;
    }
    // 行の始まりは縦譜の新しい列
    columnNo++;
    let sectionForLine: string | undefined = pendingSection ?? `${columnNo}列目`;
    pendingSection = undefined;

    const tokens = line.split(/[\s、,・|｜]+/).filter(Boolean);
    for (const token of tokens) {
      // 1つの区切りの中身を「音」と「伸ばし」に分ける
      const parts: { stringId: number; oshide: boolean }[] = [];
      let extend = 0;
      let i = 0;
      const chars = Array.from(token);
      while (i < chars.length) {
        const c = chars[i];
        if (KANJI_TO_ID[c]) {
          parts.push({ stringId: KANJI_TO_ID[c], oshide: false });
          i++;
        } else if (/[0-9]/.test(c)) {
          // 数字（1〜13）
          let num = '';
          while (i < chars.length && /[0-9]/.test(chars[i])) {
            num += chars[i];
            i++;
          }
          const n = parseInt(num, 10);
          if (n >= 1 && n <= 13) parts.push({ stringId: n, oshide: false });
          else errors.push(`${lineNo}行目: 「${num}」は 1〜13 ではありません`);
        } else if (REST_CHARS.has(c)) {
          parts.push({ stringId: REST_STRING_ID, oshide: false });
          i++;
        } else if (OSHI_CHARS.has(c) && parts.length > 0) {
          parts[parts.length - 1].oshide = true;
          i++;
        } else if (EXTEND_CHARS.has(c)) {
          extend++;
          i++;
        } else {
          errors.push(`${lineNo}行目: 「${c}」は使えない文字です`);
          i++;
        }
      }
      if (parts.length === 0) continue;

      const share = 1 / parts.length;
      parts.forEach((p, idx) => {
        const isLast = idx === parts.length - 1;
        const note: SongNote = {
          stringId: p.stringId,
          duration: share + (isLast ? extend : 0),
        };
        if (p.oshide) note.technique = 'oshide';
        if (sectionForLine) {
          note.section = sectionForLine;
          sectionForLine = undefined;
        }
        notes.push(note);
      });
    }
  }

  if (notes.length === 0 && errors.length === 0) {
    errors.push('弦の名前（一〜巾）が1つも見つかりません');
  }
  return { notes, errors };
}

/** 曲データを文字の楽譜に戻す（コピーして共有・お手本に使う） */
export function songToText(song: Song): string {
  const lines: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) lines.push(current.join(' '));
    current = [];
  };
  const noteChar = (n: SongNote) =>
    (n.stringId === REST_STRING_ID ? '◯' : ID_TO_KANJI[n.stringId] ?? '?') +
    (n.technique === 'oshide' ? 'オ' : '');

  const notes = song.notes;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    if (n.section) {
      flush();
      lines.push(`# ${n.section}`);
    }
    // 1拍に満たない音は、合わせて1拍になるまでまとめて書く
    if (n.duration < 1) {
      let group = noteChar(n);
      let total = n.duration;
      while (total < 0.999 && i + 1 < notes.length && !notes[i + 1].section) {
        i++;
        group += noteChar(notes[i]);
        total += notes[i].duration;
      }
      const extra = Math.round(total - 1);
      current.push(group + 'ー'.repeat(Math.max(0, extra)));
    } else {
      const extra = Math.round(n.duration - 1);
      current.push(noteChar(n) + 'ー'.repeat(Math.max(0, extra)));
    }
  }
  flush();
  return lines.join('\n');
}
