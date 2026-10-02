import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, Music, HelpCircle, Layers, Disc, Square, Wind, SlidersHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { LabelMode, KotoTuning } from '../types/koto';
import { soundEngine, RecordingResult, KotoStringType } from '../utils/soundEngine';
import { ReverbEnvironment, REVERB_ENVIRONMENTS } from '../utils/reverb';
import { ALL_TUNINGS } from '../data/tunings';

interface HeaderProps {
  labelMode: LabelMode;
  setLabelMode: (mode: LabelMode) => void;
  orientation: 'horizontal' | 'vertical';
  setOrientation: (val: 'horizontal' | 'vertical') => void;
  showKeyBinds: boolean;
  setShowKeyBinds: (val: boolean) => void;
  songGuideActive: boolean;
  setSongGuideActive: (val: boolean) => void;
  activeTuning: KotoTuning;
  setActiveTuning: (tuning: KotoTuning) => void;
  onOpenTuningModal: () => void;
  onRecordingComplete: (result: RecordingResult) => void;
  hasRecording: boolean;
  onOpenRecordingDialog: () => void;
  onOpenVisualSettingsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  labelMode,
  setLabelMode,
  orientation,
  setOrientation,
  showKeyBinds,
  setShowKeyBinds,
  songGuideActive,
  setSongGuideActive,
  activeTuning,
  setActiveTuning,
  onOpenTuningModal,
  onRecordingComplete,
  hasRecording,
  onOpenRecordingDialog,
  onOpenVisualSettingsModal,
}) => {
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isGlissandoPlaying, setIsGlissandoPlaying] = useState<boolean>(false);
  const [audioReady, setAudioReady] = useState<boolean>(soundEngine.isReady());

  // Timbre & Space
  const [stringType, setStringType] = useState<KotoStringType>(soundEngine.getStringType());
  const [reverbEnv, setReverbEnv] = useState<ReverbEnvironment>(soundEngine.getReverbEnvironment());

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recSeconds, setRecSeconds] = useState<number>(0);
  const recTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recTimerRef.current) {
        clearInterval(recTimerRef.current);
      }
    };
  }, []);

  const handleStringTypeChange = (type: KotoStringType) => {
    setStringType(type);
    soundEngine.setStringType(type);
  };

  const handleReverbEnvChange = (env: ReverbEnvironment) => {
    setReverbEnv(env);
    soundEngine.setReverbEnvironment(env);
  };

  const handleReverbQuickToggle = () => {
    const next: ReverbEnvironment = reverbEnv === 'off' ? 'studio' : 'off';
    handleReverbEnvChange(next);
  };

  const handleTuningSelect = (tuningId: string) => {
    const t = ALL_TUNINGS.find((item) => item.id === tuningId);
    if (t) {
      setActiveTuning(t);
      soundEngine.setTuning(t);
    }
  };

  const handleStartRecording = async () => {
    const success = await soundEngine.startRecording();
    if (success) {
      setIsRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => {
        setRecSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleStopRecording = async () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setIsRecording(false);
    const result = await soundEngine.stopRecording();
    if (result) {
      onRecordingComplete(result);
    }
  };

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAudioInit = async () => {
    const ready = await soundEngine.init();
    setAudioReady(ready);
    if (ready) {
      soundEngine.playString(1, activeTuning.strings[0].frequency, 0.7);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundEngine.setVolume(val);
    if (isMuted && val > 0) {
      setIsMuted(false);
      soundEngine.setMute(false);
    }
  };

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundEngine.setMute(next);
  };

  const handlePlayGlissando = (direction: 'up' | 'down') => {
    if (isGlissandoPlaying) return;
    setIsGlissandoPlaying(true);
    soundEngine.playGlissando(
      activeTuning.strings,
      direction,
      600,
      (stringId) => {
        window.dispatchEvent(
          new CustomEvent('koto:pluck', { detail: { stringId } })
        );
      }
    );
    setTimeout(() => {
      setIsGlissandoPlaying(false);
    }, 750);
  };

  return (
    <header className="koto-header shrink-0 w-full bg-stone-950/90 backdrop-blur-md border-b border-amber-950/50 px-3 sm:px-6 py-2 z-40 select-none">
      <div className="koto-header-row max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
        {/* Zone 1: Wordmark & Tuning Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-baseline gap-2">
            <h1 className="font-serif-jp text-lg sm:text-xl font-bold tracking-tight text-amber-200">
              箏
            </h1>
            <span className="text-xs text-amber-500/80 font-serif-jp hidden sm:inline">
              十三弦シミュレーター
            </span>
          </div>

          {/* Audio init status */}
          {!audioReady ? (
            <button
              onClick={handleAudioInit}
              className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors animate-pulse"
              title="ブラウザの音声制限を解除します"
            >
              音声を有効化
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 font-mono hidden md:inline">
              ● 発音可能
            </span>
          )}
        </div>

        {/* Zone 2: Navigation controls & educational toggles */}
        <div className="koto-header-tools flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
          {/* Tuning Selector (調弦切替: 平調子・雲井・乃木・中空・古今・雅楽) */}
          <div className="flex items-center gap-1 bg-stone-900 border border-amber-900/60 rounded-lg px-2 py-1 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={activeTuning.id}
              onChange={(e) => handleTuningSelect(e.target.value)}
              className="bg-transparent text-amber-200 font-serif-jp text-xs focus:outline-none cursor-pointer"
              title="調弦（チューニング）を切り替えます。琴柱が自動的に実機位置へ移動します。"
            >
              {ALL_TUNINGS.map((t) => (
                <option key={t.id} value={t.id} className="bg-stone-950 text-stone-200">
                  {t.name} ({t.mood})
                </option>
              ))}
            </select>
          </div>

          {/* Label selector: 漢数字 / ドレミ / 音名 */}
          <div className="flex items-center p-0.5 bg-stone-900 border border-stone-800 rounded-lg text-xs">
            <button
              onClick={() => setLabelMode('kanji')}
              className={`px-2 py-1 rounded font-serif-jp text-xs transition-colors whitespace-nowrap ${
                labelMode === 'kanji'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              漢数字
            </button>
            <button
              onClick={() => setLabelMode('doremi')}
              className={`px-2 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                labelMode === 'doremi'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              ドレミ
            </button>
            <button
              onClick={() => setLabelMode('western')}
              className={`px-2 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                labelMode === 'western'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              音名
            </button>
          </div>

          {/* String Timbre Selector (本絹糸 / テトロン糸) */}
          <div
            className="flex items-center p-0.5 bg-stone-900 border border-stone-800 rounded-lg text-xs"
            title="箏の糸質（音色）を選択"
          >
            <button
              onClick={() => handleStringTypeChange('silk')}
              className={`px-2 py-1 rounded text-xs font-serif-jp transition-colors whitespace-nowrap ${
                stringType === 'silk'
                  ? 'bg-amber-700/80 text-amber-100 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              本絹糸
            </button>
            <button
              onClick={() => handleStringTypeChange('tetron')}
              className={`px-2 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                stringType === 'tetron'
                  ? 'bg-amber-700/80 text-amber-100 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              テトロン
            </button>
          </div>

          {/* Master Reverb Effect Selector (ConvolverNode simulation: Studio, Traditional Hall, Temple, Off) */}
          <div
            className="flex items-center gap-1 bg-stone-900 border border-stone-800 hover:border-amber-700/60 transition-colors rounded-lg px-2 py-1 text-xs"
            title="空間残響効果（ConvolverNode）：スタジオや能舞台、大本堂など異なる音響空間をシミュレート"
          >
            <button
              onClick={handleReverbQuickToggle}
              className="p-0.5 hover:opacity-80 transition-opacity"
              title={reverbEnv === 'off' ? '残響を有効化' : '残響をミュート（ドライ音）'}
            >
              <Wind className={`w-3.5 h-3.5 shrink-0 ${reverbEnv !== 'off' ? 'text-amber-400' : 'text-stone-500'}`} />
            </button>
            <select
              value={reverbEnv}
              onChange={(e) => handleReverbEnvChange(e.target.value as ReverbEnvironment)}
              className="bg-transparent text-xs font-serif-jp text-stone-200 focus:outline-none cursor-pointer"
              title="残響空間（Master Reverb）"
            >
              {REVERB_ENVIRONMENTS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-stone-950 text-stone-200">
                  {opt.label} ({opt.labelEn})
                </option>
              ))}
            </select>
          </div>

          {/* Orientation switch */}
          <button
            onClick={() => setOrientation(orientation === 'horizontal' ? 'vertical' : 'horizontal')}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:border-stone-700 transition-colors whitespace-nowrap"
            title="弦の向きを切り替えます"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {orientation === 'horizontal' ? '横置き' : '縦置き'}
            </span>
          </button>

          {/* Keyboard shortcut display toggle */}
          <button
            onClick={() => setShowKeyBinds(!showKeyBinds)}
            className={`hidden xl:flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors whitespace-nowrap ${
              showKeyBinds
                ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title="PCキーボード対応表の表示"
          >
            <span className="font-mono text-[10px] border border-current px-1 rounded">1-9</span>
            <span>鍵盤ガイド</span>
          </button>

          {/* Sakura Sakura Practice Mode Toggle */}
          <button
            onClick={() => setSongGuideActive(!songGuideActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all whitespace-nowrap ${
              songGuideActive
                ? 'bg-rose-950/70 border-rose-500 text-rose-200 shadow-sm'
                : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-rose-400" />
            <span>さくらさくら</span>
          </button>

          {/* Dual Glissando: 引連（上り）& 流し爪（下り） */}
          <div className="flex items-center p-0.5 bg-stone-900 border border-stone-800 rounded-lg text-xs">
            <button
              onClick={() => handlePlayGlissando('up')}
              disabled={isGlissandoPlaying}
              className="flex items-center gap-1 px-2 py-1 text-xs text-amber-300 hover:text-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap"
              title="引連（低音から高音への駆け上がり）"
            >
              <ArrowUp className="w-3 h-3 text-amber-400" />
              <span>引連</span>
            </button>
            <div className="w-[1px] h-3 bg-stone-700" />
            <button
              onClick={() => handlePlayGlissando('down')}
              disabled={isGlissandoPlaying}
              className="flex items-center gap-1 px-2 py-1 text-xs text-amber-300 hover:text-amber-100 disabled:opacity-50 transition-colors whitespace-nowrap"
              title="流し爪（高音から低音への駆け下り）"
            >
              <ArrowDown className="w-3 h-3 text-amber-400" />
              <span>流し爪</span>
            </button>
          </div>

          {/* Real-time Recording via MediaStreamAudioDestinationNode */}
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-stone-900 border border-stone-800 text-stone-300 hover:text-white hover:border-rose-500/60 transition-colors whitespace-nowrap"
              title="演奏をリアルタイム録音（WAV形式で保存可能）"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>録音</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-rose-950 border border-rose-500 text-rose-100 shadow-md shadow-rose-950 transition-all whitespace-nowrap"
              title="録音を停止してWAVを生成"
            >
              <Square className="w-2.5 h-2.5 fill-rose-500 text-rose-500 animate-pulse shrink-0" />
              <span className="font-mono text-xs">{formatRecTime(recSeconds)}</span>
              <span className="text-[11px] font-bold text-rose-300 ml-0.5">停止</span>
            </button>
          )}

          {/* Re-open saved recording dialog */}
          {!isRecording && hasRecording && (
            <button
              onClick={onOpenRecordingDialog}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
              title="直前の録音データ（WAV）を表示"
            >
              <Disc className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">録音データ</span>
            </button>
          )}
        </div>

        {/* Zone 3: Actions & Master Volume */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleMuteToggle}
              className="p-1 text-stone-400 hover:text-stone-200 transition-colors"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-stone-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              title="主音量（Master Volume）"
            />
          </div>

          {/* Visual Feedback Settings (低スペック・省電力最適化) */}
          <button
            onClick={onOpenVisualSettingsModal}
            className="p-1 text-stone-400 hover:text-amber-300 transition-colors"
            title="描画・視覚演出設定（弦の振動・発光強度・琴柱表示）"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenTuningModal}
            className="p-1 text-stone-400 hover:text-amber-300 transition-colors"
            title="調弦・特殊奏法・箏の解説"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
