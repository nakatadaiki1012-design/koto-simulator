import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, ChevronRight, ChevronLeft, X, Music2, SlidersHorizontal, Award } from 'lucide-react';
import { Song, SongNote, LabelMode, KotoTuning } from '../types/koto';
import { ALL_PRACTICE_SONGS } from '../data/songs';
import { ALL_TUNINGS } from '../data/tunings';
import { soundEngine } from '../utils/soundEngine';

interface SongGuideBarProps {
  labelMode: LabelMode;
  onTargetStringChange: (stringId: number | null) => void;
  onClose: () => void;
  lastPluckedStringId: number | null;
  activeTuning: KotoTuning;
  onSelectTuning: (tuning: KotoTuning) => void;
}

export const SongGuideBar: React.FC<SongGuideBarProps> = ({
  labelMode,
  onTargetStringChange,
  onClose,
  lastPluckedStringId,
  activeTuning,
  onSelectTuning,
}) => {
  const songs: Song[] = ALL_PRACTICE_SONGS;
  const [selectedSongIndex, setSelectedSongIndex] = useState<number>(0);
  const currentSong = songs[selectedSongIndex];

  const [currentNoteIndex, setCurrentNoteIndex] = useState<number>(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentNote: SongNote | undefined = currentSong.notes[currentNoteIndex];

  // Update target string on instrument when currentNoteIndex changes
  useEffect(() => {
    if (currentNote) {
      onTargetStringChange(currentNote.stringId);
    } else {
      onTargetStringChange(null);
    }
  }, [currentNote, onTargetStringChange]);

  // Clean up when unmounting
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      onTargetStringChange(null);
    };
  }, [onTargetStringChange]);

  // Advance on correct manual user pluck
  useEffect(() => {
    if (!isPlayingAuto && currentNote && lastPluckedStringId === currentNote.stringId) {
      const nextIndex = currentNoteIndex + 1;
      if (nextIndex < currentSong.notes.length) {
        setCurrentNoteIndex(nextIndex);
      } else {
        setCurrentNoteIndex(0);
      }
    }
  }, [lastPluckedStringId, currentNote, currentNoteIndex, currentSong.notes.length, isPlayingAuto]);

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

      if (stringData) {
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

  const handleSongChange = (idx: number) => {
    handleReset();
    setSelectedSongIndex(idx);
    const newSong = songs[idx];
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
                {getStringLabel(currentNote.stringId)}
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
          <span className="text-[11px] text-stone-500 font-mono">
            ({currentNoteIndex + 1}/{currentSong.notes.length})
          </span>
        </div>

        {/* Right: Practice Playback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
    </div>
  );
};
