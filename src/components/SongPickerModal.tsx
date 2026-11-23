import React from 'react';
import { createPortal } from 'react-dom';
import { X, Music2, Check } from 'lucide-react';
import { Song } from '../types/koto';
import { songImage } from '../data/songImages';

interface SongPickerModalProps {
  songs: Song[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  入門: 'bg-emerald-700/90',
  初級: 'bg-sky-700/90',
  中級: 'bg-amber-700/90',
  上級: 'bg-rose-700/90',
  自作: 'bg-violet-700/90',
};

/** 絵の付いたカードから練習する曲を選ぶ画面 */
export const SongPickerModal: React.FC<SongPickerModalProps> = ({ songs, selectedIndex, onSelect, onClose }) =>
  createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-stone-900 border border-rose-900/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-rose-400" />
            <h2 className="font-serif-jp text-lg font-bold text-rose-200">練習する曲を選ぶ</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {songs.map((s, idx) => {
            const selected = idx === selectedIndex;
            return (
              <button
                key={s.id}
                onClick={() => {
                  onSelect(idx);
                  onClose();
                }}
                className={`group relative text-left rounded-xl overflow-hidden border transition-all ${
                  selected
                    ? 'border-rose-400 ring-2 ring-rose-500/70'
                    : 'border-stone-800 hover:border-amber-500/60 hover:-translate-y-0.5'
                }`}
              >
                <img
                  src={songImage(s)}
                  alt=""
                  loading="lazy"
                  className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* 文字が読みやすいように下を暗くする */}
                <div className="absolute inset-x-0 bottom-0 pt-10 pb-2 px-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                  <p className="font-serif-jp font-bold text-sm sm:text-base text-white leading-tight">{s.title}</p>
                  <p className="text-[10px] text-stone-300 mt-0.5">{s.tuningName}</p>
                </div>
                <span
                  className={`absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded text-white font-serif-jp ${
                    DIFFICULTY_COLOR[s.difficulty] ?? 'bg-stone-700'
                  }`}
                >
                  {s.difficulty}
                </span>
                {selected && (
                  <span className="absolute top-2 right-2 p-0.5 rounded-full bg-rose-500 text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
