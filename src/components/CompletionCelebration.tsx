import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import { publicImage } from '../data/songImages';

interface CompletionCelebrationProps {
  songTitle: string;
  onRetry: () => void;
  onClose: () => void;
}

/** 曲を最後まで弾けたときのお祝い画面 */
export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({ songTitle, onRetry, onClose }) => {
  // ふわっと出てくるように、表示した直後に少しだけ遅らせて切り替える
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-500 ${
        shown ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-sm rounded-2xl overflow-hidden border border-amber-500/50 shadow-2xl bg-stone-950 transition-transform duration-500 ${
          shown ? 'scale-100' : 'scale-90'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <img src={publicImage('celebrate.webp')} alt="" className="w-full aspect-square object-cover" />
        <div className="absolute inset-x-0 bottom-0 pt-16 pb-4 px-4 bg-gradient-to-t from-black via-black/80 to-transparent text-center">
          <p className="font-serif-jp text-3xl font-bold text-amber-300 drop-shadow">お見事！</p>
          <p className="font-serif-jp text-sm text-stone-100 mt-1">「{songTitle}」を最後まで弾けました</p>
          <div className="flex justify-center gap-2 mt-3">
            <button
              onClick={onRetry}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              もう一度
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm"
            >
              <X className="w-4 h-4" />
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
