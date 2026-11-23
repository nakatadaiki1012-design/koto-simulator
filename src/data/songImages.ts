import { Song } from '../types/koto';

// 曲ごとのイラスト（public/images/songs にある画像）。
// 絵がない曲・自分で追加した曲は default（和室の行灯）を使う。
const SONG_IMAGE_FILES: Record<string, string> = {
  sakura: 'sakura.webp',
  usagi: 'usagi.webp',
  komoriuta: 'komoriuta.webp',
  kojo: 'kojo.webp',
  chidori: 'chidori.webp',
  harunoumi: 'harunoumi.webp',
};

/** public フォルダの画像のURL（公開先の場所が変わっても動くように BASE_URL を付ける） */
export const publicImage = (path: string) => `${import.meta.env.BASE_URL}images/${path}`;

export const songImage = (song: Song) =>
  publicImage(`songs/${SONG_IMAGE_FILES[song.id] ?? 'default.webp'}`);
