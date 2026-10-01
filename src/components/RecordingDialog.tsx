import React, { useState, useEffect, useRef } from 'react';
import { Download, Play, Pause, Trash2, X, Music, CheckCircle2 } from 'lucide-react';
import { RecordingResult } from '../utils/soundEngine';

interface RecordingDialogProps {
  recording: RecordingResult | null;
  onClose: () => void;
  onClear: () => void;
}

export const RecordingDialog: React.FC<RecordingDialogProps> = ({
  recording,
  onClose,
  onClear,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (recording) {
      const audio = new Audio(recording.url);
      audioRef.current = audio;

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      return () => {
        audio.pause();
        audio.src = '';
        audioRef.current = null;
      };
    }
  }, [recording]);

  if (!recording) return null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
      now.getHours()
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `koto_performance_${timestamp}.wav`;

    const a = document.createElement('a');
    a.href = recording.url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-stone-900 border border-amber-900/60 rounded-2xl shadow-2xl overflow-hidden text-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-serif-jp text-base font-bold text-amber-200">
              演奏の録音完了
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Audio Info Card */}
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <span className="font-semibold text-stone-200 block text-sm">
                  箏 演奏データ
                </span>
                <span className="text-stone-400 font-mono text-[11px]">
                  WAV (16-bit PCM / 44.1kHz ステレオ)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-amber-300 font-mono text-sm font-semibold block">
                {formatDuration(recording.duration)}
              </span>
              <span className="text-stone-500 text-[10px]">
                {formatFileSize(recording.blob.size)}
              </span>
            </div>
          </div>

          {/* In-app Preview Player */}
          <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800 flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-amber-600 hover:bg-amber-500 text-stone-950 flex items-center justify-center shadow-md transition-colors shrink-0"
              title={isPlaying ? '一時停止' : 'プレビュー再生'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex justify-between text-[10px] text-stone-400 font-mono mb-1">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(recording.duration)}</span>
              </div>
              <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${Math.min(100, (currentTime / recording.duration) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-stone-400 leading-relaxed">
            Web Audio APIの <code className="text-amber-300">MediaStreamAudioDestinationNode</code> で内部音声を直接キャプチャしているため、外部環境音の混入なく高音質なWAVデータとして保存できます。
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onClear();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-stone-400 hover:text-rose-400 transition-colors text-xs"
            title="録音データを破棄"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>破棄</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-stone-400 hover:text-stone-200 text-xs"
            >
              閉じる
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg text-xs transition-colors shadow-md shadow-amber-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>WAVをダウンロード</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
