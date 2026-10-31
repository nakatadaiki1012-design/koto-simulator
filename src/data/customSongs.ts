import { Song } from '../types/koto';

// 自分で追加した曲は、このブラウザの中に保存する（サーバーには送らない）
const STORAGE_KEY = 'koto_custom_songs';

export function loadCustomSongs(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isValidSong) : [];
  } catch {
    return [];
  }
}

export function saveCustomSongs(songs: Song[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch {}
}

/** 貼り付けられたJSONなどが曲データとして使えるか確かめる */
export function isValidSong(s: unknown): s is Song {
  if (!s || typeof s !== 'object') return false;
  const song = s as Song;
  return (
    typeof song.title === 'string' &&
    Array.isArray(song.notes) &&
    song.notes.length > 0 &&
    song.notes.every(
      (n) =>
        n &&
        typeof n.stringId === 'number' &&
        n.stringId >= 0 &&
        n.stringId <= 13 &&
        typeof n.duration === 'number' &&
        n.duration > 0
    )
  );
}
