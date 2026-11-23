import React, { useEffect, useMemo, useRef } from 'react';
import { Song, SongNote } from '../types/koto';
import { ID_TO_KANJI, REST_STRING_ID } from '../utils/songText';

interface TatefuViewProps {
  song: Song;
  currentNoteIndex: number;
  onSelectNote: (index: number) => void;
}

// 1つのマスの高さ（1拍ぶん）と、列の最大の高さ（px）
const BEAT_PX = 26;
const MAX_COLUMN_PX = 150;

// 半拍の音も文字が重ならないように、最低 20px は確保する
const cellHeight = (n: SongNote) => Math.max(20, Math.round(BEAT_PX * Math.min(n.duration, 4)));

/**
 * 縦譜（たてふ）表示。
 * 本物の箏の楽譜と同じく、上から下へ読み、列は右から左へ進む。
 * 今弾く音が赤く光り、タップするとその音から練習できる。
 */
export const TatefuView: React.FC<TatefuViewProps> = ({ song, currentNoteIndex, onSelectNote }) => {
  const currentRef = useRef<HTMLButtonElement | null>(null);

  // 区切り（section）ごと、かつ高さが入りきる分ずつ列に分ける
  const columns = useMemo(() => {
    const cols: { index: number; note: SongNote }[][] = [];
    let col: { index: number; note: SongNote }[] = [];
    let height = 0;
    song.notes.forEach((note, index) => {
      const h = cellHeight(note);
      if (col.length > 0 && (note.section || height + h > MAX_COLUMN_PX)) {
        cols.push(col);
        col = [];
        height = 0;
      }
      col.push({ index, note });
      height += h;
    });
    if (col.length) cols.push(col);
    return cols;
  }, [song]);

  // 今の音が見える位置まで自動でスクロール
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [currentNoteIndex, song]);

  return (
    <div
      className="w-full overflow-x-auto overflow-y-auto max-h-[40vh] bg-[#f4ecd8] text-stone-900 rounded-md border border-amber-900/40 shadow-inner"
      style={{ scrollbarWidth: 'thin' }}
      aria-label={`${song.title} の縦譜`}
    >
      {/* 列は右から左へ並べる */}
      <div className="flex flex-row-reverse items-start gap-0 px-2 py-2 w-max min-w-full">
        {columns.map((col, ci) => (
          <div
            key={ci}
            className="flex flex-col items-stretch px-1.5 border-l border-stone-400/50 first:border-r"
            style={{ minHeight: MAX_COLUMN_PX }}
          >
            {col.map(({ index, note }) => {
              const isCurrent = index === currentNoteIndex;
              const isDone = index < currentNoteIndex;
              const isRest = note.stringId === REST_STRING_ID;
              const isShort = note.duration < 1;
              return (
                <button
                  key={index}
                  ref={isCurrent ? currentRef : undefined}
                  onClick={() => onSelectNote(index)}
                  title={`${index + 1}音目から練習`}
                  className={`relative flex items-start justify-center w-11 rounded-sm transition-colors ${
                    isCurrent
                      ? 'bg-rose-600 text-white shadow'
                      : isDone
                      ? 'text-stone-400'
                      : 'text-stone-900 hover:bg-amber-200/60'
                  }`}
                  style={{ height: cellHeight(note) }}
                >
                  <span
                    className={`font-serif-jp font-bold ${isShort ? 'text-sm' : 'text-lg'}`}
                    style={{ lineHeight: `${Math.min(26, cellHeight(note))}px` }}
                  >
                    {isRest ? '○' : ID_TO_KANJI[note.stringId]}
                  </span>
                  {/* 押し手は右に「オ」 */}
                  {note.technique === 'oshide' && (
                    <span className="absolute right-0.5 top-0.5 text-[9px] font-bold leading-none">オ</span>
                  )}
                  {/* 歌詞は左に小さく */}
                  {note.lyric && !/^[一二三四五六七八九十斗為巾]/.test(note.lyric) && (
                    <span
                      className={`absolute left-0 top-1 text-[9px] leading-none ${
                        isCurrent ? 'text-rose-100' : 'text-stone-500'
                      }`}
                    >
                      {note.lyric}
                    </span>
                  )}
                  {/* 半拍の音は右に線（2つで1拍） */}
                  {isShort && (
                    <span
                      className={`absolute right-0 top-1 bottom-1 w-px ${isCurrent ? 'bg-white' : 'bg-stone-600'}`}
                    />
                  )}
                  {/* 伸ばす音は下に線 */}
                  {note.duration > 1 && (
                    <span
                      className={`absolute left-1/2 -translate-x-1/2 bottom-1 w-px ${
                        isCurrent ? 'bg-white' : 'bg-stone-500'
                      }`}
                      style={{ height: cellHeight(note) - 28 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
