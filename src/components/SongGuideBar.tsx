import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, X, Music2, SlidersHorizontal, ScrollText, Lightbulb, FilePlus2 } from 'lucide-react';
import { Song, SongNote, LabelMode, KotoTuning } from '../types/koto';
import { ALL_PRACTICE_SONGS } from '../data/songs';
import { ALL_TUNINGS } from '../data/tunings';
import { loadCustomSongs, saveCustomSongs } from '../data/customSongs';
import { soundEngine } from '../utils/soundEngine';
import { REST_STRING_ID } from '../utils/songText';
import { TatefuView } from './TatefuView';
import { SongImportModal } from './SongImportModal';

/** 弦を弾いたことを知らせる情報。seq は弾くたびに1ずつ増える（同じ弦を続けて弾いても区別できる） */
export interface PluckSignal {
  stringId: number;
  seq: number;
}

// ブラウザに保存する小さな設定の読み書き
const loadFlag = (key: string, fallback: boolean) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
};
const saveFlag = (key: string, val: boolean) => {
  try {
    localStorage.setItem(key, val ? '1' : '0');
  } catch {}
};

interface SongGuideBarProps {
  labelMode: LabelMode;
  onTargetStringChange: (stringId: number | null) => void;
  onClose: () => void;
  lastPluck: PluckSignal | null;
  activeTuning: KotoTuning;
  onSelectTuning: (tuning: KotoTuning) => void;
}

export const SongGuideBar: React.FC<SongGuideBarProps> = ({
  labelMode,
  onTargetStringChange,
  onClose,
  lastPluck,
  activeTuning,
  onSelectTuning,
}) => {
  // 収録曲 ＋ 自分で追加した曲
  const [customSongs, setCustomSongs] = useState<Song[]>(() => loadCustomSongs());
  const songs: Song[] = useMemo(() => [...ALL_PRACTICE_SONGS, ...customSongs], [customSongs]);
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(0);
  const currentSong = songs[selectedSongIndex] ?? songs[0];
  const [isImportOpen, setIsImportOpen] = useState(false);

  // 縦譜を表示するか（画面が低いスマホ横向きでは最初は閉じておく） ／ 次に弾く弦を光らせるか（慣れたら消して縦譜だけで弾く）
  const [showTatefu, setShowTatefuState] = useState<boolean>(() => loadFlag('koto_show_tatefu', typeof window === 'undefined' || window.innerHeight >= 600));
  const [highlightString, setHighlightStringState] = useState<boolean>(() => loadFlag('koto_guide_highlight', true));
  const setShowTatefu = (v: boolean) => {
    setShowTatefuState(v);
    saveFlag('koto_show_tatefu', v);
  };
  const setHighlightString = (v: boolean) => {
    setHighlightStringState(v);
    saveFlag('koto_guide_highlight', v);
  };

  const [currentNoteIndex, setCurrentNoteIndex] = useState<number>(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentNote: SongNote | undefined = currentSong.notes[currentNoteIndex];

  // 次に弾く弦を楽器の上で光らせる（休みの音や、光をオフにしたときは光らせない）
  useEffect(() => {
    if (currentNote && highlightString && currentNote.stringId !== REST_STRING_ID) {
      onTargetStringChange(currentNote.stringId);
    } else {
      onTargetStringChange(null);
    }
  }, [currentNote, highlightString, onTargetStringChange]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      onTargetStringChange(null);
    };
  }, [onTargetStringChange]);

  // 休みの音は飛ばして、次に弾く音の番号を求める
  const nextPlayableIndex = useCallback(
    (from: number) => {
      let i = from;
      while (i < currentSong.notes.length && currentSong.notes[i].stringId === REST_STRING_ID) i++;
      return i < currentSong.notes.length ? i : 0;
    },
    [currentSong]
  );

  // 正しい弦を弾いたら次の音へ進む。
  // 1回弾くごとに1回だけ処理する（以前は「七・七」のように同じ弦が続くと、1回で2音進んでしまっていた）
  const handledPluckSeq = useRef<number>(lastPluck?.seq ?? 0);
  useEffect(() => {
    if (!lastPluck || lastPluck.seq === handledPluckSeq.current) return;
    handledPluckSeq.current = lastPluck.seq;
    if (!isPlayingAuto && currentNote && lastPluck.stringId === currentNote.stringId) {
      setCurrentNoteIndex(nextPlayableIndex(currentNoteIndex + 1));
    }
  }, [lastPluck, currentNote, currentNoteIndex, isPlayingAuto, nextPlayableIndex]);

  // Auto-play routine
  const playNextAutoNote = useCallback(
    (index: number) => {
      if (index >= currentSong.notes.length) {
        setIsPlayingAuto(false);
        setCurrentNoteIndex(0);
        return;
      }

      setCurrentNoteIndex(index);
      const note = currentSong.notes[index];
      const stringData = activeTuning.strings.find((s) => s.id === note.stringId);

      if (stringData && note.stringId !== REST_STRING_ID) {
        soundEngine.playString(note.stringId, stringData.frequency, 0.85, note.technique || 'normal');
        window.dispatchEvent(
          new CustomEvent('koto:pluck', { detail: { stringId: note.stringId } })
        );
      }

      const beatDurationMs = (60000 / currentSong.bpm) * (note.duration || 1);

      autoPlayTimerRef.current = setTimeout(() => {
        playNextAutoNote(index + 1);
      }, beatDurationMs);
    },
    [currentSong, activeTuning.strings]
  );

  const toggleAutoPlay = () => {
    if (isPlayingAuto) {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      setIsPlayingAuto(false);
    } else {
      setIsPlayingAuto(true);
      playNextAutoNote(currentNoteIndex);
    }
  };

  const handleReset = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    setIsPlayingAuto(false);
    setCurrentNoteIndex(0);
  };

  const handlePrev = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    setIsPlayingAuto(false);
    setCurrentNoteIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
    setIsPlayingAuto(false);
    setCurrentNoteIndex((prev) => Math.min(currentSong.notes.length - 1, prev + 1));
  };

  const handleSongChange = (idx: number, list: Song[] = songs) => {
    handleReset();
    setSelectedSongIndex(idx);
    const newSong = list[idx];
    if (!newSong) return;
    // Automatically match tuning if different
    if (newSong.tuningId && newSong.tuningId !== activeTuning.id) {
      const match = ALL_TUNINGS.find((t) => t.id === newSong.tuningId);
      if (match) {
        onSelectTuning(match);
      }
    }
  };

  const getStringLabel = (stringId: number) => {
    const s = activeTuning.strings.find((item) => item.id === stringId);
    if (!s) return '';
    if (labelMode === 'kanji') return s.kanji;
    if (labelMode === 'doremi') return s.doremi;
    return s.westernPitch;
  };

  // 縦譜の音をタップしたら、その音から練習する
  const handleSelectNote = (index: number) => {
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    setIsPlayingAuto(false);
    setCurrentNoteIndex(index);
  };

  const handleAddSongs = (added: Song[]) => {
    const next = [...customSongs, ...added];
    setCustomSongs(next);
    saveCustomSongs(next);
    // 追加した曲をすぐ選ぶ
    handleSongChange(ALL_PRACTICE_SONGS.length + customSongs.length, [...ALL_PRACTICE_SONGS, ...next]);
  };

  const handleDeleteSong = (id: string) => {
    const next = customSongs.filter((s) => s.id !== id);
    setCustomSongs(next);
    saveCustomSongs(next);
    if (currentSong.id === id) handleSongChange(0);
    else {
      const newIdx = [...ALL_PRACTICE_SONGS, ...next].findIndex((s) => s.id === currentSong.id);
      setSelectedSongIndex(Math.max(0, newIdx));
    }
  };

  // この先に弾く音（3つ先まで）を薄く表示して、心の準備ができるようにする
  const upcomingNotes = currentSong.notes
    .slice(currentNoteIndex + 1)
    .filter((n) => n.stringId !== REST_STRING_ID)
    .slice(0, 3);

  const isTuningMismatch = currentSong.tuningId && currentSong.tuningId !== activeTuning.id;

  return (
    <div className="shrink-0 w-full bg-stone-900/95 border-b border-rose-950/60 shadow-lg px-3 sm:px-6 py-2 z-30 select-none backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Song selection & metadata */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-rose-400">
            <Music2 className="w-4 h-4 shrink-0" />
            <select
              value={selectedSongIndex}
              onChange={(e) => handleSongChange(parseInt(e.target.value, 10))}
              className="bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-rose-200 font-serif-jp cursor-pointer focus:outline-none focus:border-rose-500"
            >
              {songs.map((s, idx) => (
                <option key={s.id} value={idx}>
                  {s.title} ({s.difficulty}・{s.tuningName})
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Badge */}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-800/60 font-serif-jp shrink-0">
            {currentSong.difficulty}
          </span>

          {/* Tuning Mismatch notice & quick switch button */}
          {isTuningMismatch && (
            <button
              onClick={() => {
                const match = ALL_TUNINGS.find((t) => t.id === currentSong.tuningId);
                if (match) onSelectTuning(match);
              }}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors animate-pulse"
              title="この曲の指定調弦へ変更します"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>【{currentSong.tuningName}】に合わせる</span>
            </button>
          )}

          {/* Current Section & Lyric Display */}
          {currentNote?.section && (
            <span className="text-xs text-stone-400 font-serif-jp hidden md:inline">
              {currentNote.section}
            </span>
          )}
        </div>

        {/* Center: Current Note Target Display */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 hidden sm:inline">次の弦:</span>
          {currentNote ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-950/80 border border-rose-500/80 rounded-lg text-rose-200 shadow-sm animate-pulse">
              <span className="font-serif-jp font-bold text-base sm:text-lg text-amber-300">
                {currentNote.stringId === REST_STRING_ID ? '休み' : getStringLabel(currentNote.stringId)}
              </span>
              {currentNote.lyric && (
                <span className="text-xs text-stone-300 font-serif-jp">
                  「{currentNote.lyric}」
                </span>
              )}
              {currentNote.technique === 'oshide' && (
                <span className="text-[10px] px-1 py-0.2 bg-amber-500 text-stone-950 font-bold rounded">
                  押し手
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-stone-400">演奏完了！</span>
          )}
          {upcomingNotes.length > 0 && (
            <span className="hidden sm:flex items-center gap-1 font-serif-jp text-sm text-stone-500" title="この先に弾く弦">
              {upcomingNotes.map((n, i) => (
                <span key={i} style={{ opacity: 1 - i * 0.25 }}>
                  {getStringLabel(n.stringId)}
                </span>
              ))}
            </span>
          )}
          <span className="text-[11px] text-stone-500 font-mono">
            ({currentNoteIndex + 1}/{currentSong.notes.length})
          </span>
        </div>

        {/* Right: Practice Playback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowTatefu(!showTatefu)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-serif-jp transition-colors ${
              showTatefu ? 'bg-amber-200 text-stone-900' : 'bg-stone-800 text-stone-300 hover:text-white'
            }`}
            title="縦譜（漢数字の楽譜）の表示を切り替えます"
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span>縦譜</span>
          </button>
          <button
            onClick={() => setHighlightString(!highlightString)}
            className={`p-1 rounded transition-colors ${
              highlightString ? 'bg-rose-900/80 text-rose-200' : 'bg-stone-800 text-stone-500 hover:text-white'
            }`}
            title={highlightString ? '弦の光ガイド：オン（慣れたらオフにして縦譜だけで弾いてみよう）' : '弦の光ガイド：オフ'}
          >
            <Lightbulb className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="p-1 rounded bg-stone-800 text-stone-300 hover:text-white transition-colors"
            title="練習曲を追加する"
          >
            <FilePlus2 className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-stone-700 mx-0.5" />
          <button
            onClick={handlePrev}
            className="p-1 rounded bg-stone-800 text-stone-300 hover:text-white transition-colors"
            title="前の音符へ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={toggleAutoPlay}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold transition-all shadow-sm ${
              isPlayingAuto
                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
                : 'bg-rose-600 text-white hover:bg-rose-500'
            }`}
            title={isPlayingAuto ? '一時停止' : '自動お手本演奏を開始'}
          >
            {isPlayingAuto ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>停止</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>お手本再生</span>
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-1 rounded bg-stone-800 text-stone-300 hover:text-white transition-colors"
            title="次の音符へ"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-1 rounded bg-stone-800 text-stone-400 hover:text-white transition-colors"
            title="最初からやり直す"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="ml-1 p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title="練習バーを閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showTatefu && (
        <div className="max-w-7xl mx-auto mt-2">
          <TatefuView song={currentSong} currentNoteIndex={currentNoteIndex} onSelectNote={handleSelectNote} />
        </div>
      )}

      {isImportOpen && (
        <SongImportModal
          onClose={() => setIsImportOpen(false)}
          customSongs={customSongs}
          onAdd={handleAddSongs}
          onDelete={handleDeleteSong}
          currentSong={currentSong}
        />
      )}
    </div>
  );
};
