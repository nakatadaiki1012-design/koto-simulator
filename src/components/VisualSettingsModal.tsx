import React from 'react';
import { X, Sparkles, Activity, Eye, Zap, RotateCcw, MonitorSmartphone } from 'lucide-react';
import { VisualSettings, GlowIntensity, BridgeVisibility, DEFAULT_VISUAL_SETTINGS } from '../types/koto';

interface VisualSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VisualSettings;
  onUpdateSettings: (newSettings: VisualSettings) => void;
}

export const VisualSettingsModal: React.FC<VisualSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handlePresetSelect = (preset: 'low' | 'balanced' | 'high') => {
    if (preset === 'low') {
      onUpdateSettings({
        vibrationAnimation: false,
        glowIntensity: 'off',
        bridgeVisibility: 'simplified',
      });
    } else if (preset === 'balanced') {
      onUpdateSettings({
        vibrationAnimation: true,
        glowIntensity: 'subtle',
        bridgeVisibility: 'full',
      });
    } else {
      onUpdateSettings({
        vibrationAnimation: true,
        glowIntensity: 'vivid',
        bridgeVisibility: 'full',
      });
    }
  };

  const isPresetActive = (preset: 'low' | 'balanced' | 'high') => {
    if (preset === 'low') {
      return (
        !settings.vibrationAnimation &&
        settings.glowIntensity === 'off' &&
        settings.bridgeVisibility === 'simplified'
      );
    }
    if (preset === 'balanced') {
      return (
        settings.vibrationAnimation &&
        settings.glowIntensity === 'subtle' &&
        settings.bridgeVisibility === 'full'
      );
    }
    if (preset === 'high') {
      return (
        settings.vibrationAnimation &&
        settings.glowIntensity === 'vivid' &&
        settings.bridgeVisibility === 'full'
      );
    }
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-stone-900/95 border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-stone-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-jp text-stone-100 flex items-center gap-2">
                描画・視覚演出設定
              </h3>
              <p className="text-[11px] text-stone-400">
                低スペック端末・省電力向けのビジュアル最適化
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm">
          {/* Quick Performance Presets */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400/90 mb-2.5">
              <Zap className="w-3.5 h-3.5" />
              <span>ワンタップ推奨プリセット</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handlePresetSelect('low')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  isPresetActive('low')
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-sm'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-300'
                }`}
              >
                <MonitorSmartphone className="w-4 h-4 mb-1 text-emerald-400" />
                <span className="font-bold text-xs">軽量・省電力</span>
                <span className="text-[10px] text-stone-500 mt-0.5">低負荷・最速</span>
              </button>

              <button
                onClick={() => handlePresetSelect('balanced')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  isPresetActive('balanced')
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-sm'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-300'
                }`}
              >
                <Activity className="w-4 h-4 mb-1 text-amber-400" />
                <span className="font-bold text-xs">バランス</span>
                <span className="text-[10px] text-stone-500 mt-0.5">滑らか＆標準</span>
              </button>

              <button
                onClick={() => handlePresetSelect('high')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  isPresetActive('high')
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200 shadow-sm'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-300'
                }`}
              >
                <Sparkles className="w-4 h-4 mb-1 text-amber-300" />
                <span className="font-bold text-xs">最高画質</span>
                <span className="text-[10px] text-stone-500 mt-0.5">全エフェクト</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-stone-800" />

          {/* Individual Settings */}
          <div className="space-y-5">
            {/* 1. String Vibration Animation */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-stone-200">
                  <Activity className="w-4 h-4 text-amber-400/80" />
                  <span>弦の振動アニメーション</span>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  撥弦時に弦が細かく揺れ動くCSS物理アニメーション。OFFにするとGPUの再描画負荷を完全に抑えられます。
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    vibrationAnimation: !settings.vibrationAnimation,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.vibrationAnimation ? 'bg-amber-500' : 'bg-stone-700'
                }`}
                role="switch"
                aria-checked={settings.vibrationAnimation}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    settings.vibrationAnimation ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 2. Light-up Glow Intensity */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-stone-200">
                <Sparkles className="w-4 h-4 text-amber-400/80" />
                <span>発光・グロー効果の強度</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                撥弦時や練習ガイド時の金色の光彩・オーラ（box-shadow / drop-shadow）。OFFでブラー処理をゼロに削減します。
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(
                  [
                    { id: 'off', label: 'OFF (なし)', desc: '最軽量・フラット' },
                    { id: 'subtle', label: '控えめ', desc: '微細ハイライト' },
                    { id: 'vivid', label: '華やか', desc: '鮮明な光彩' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        glowIntensity: opt.id as GlowIntensity,
                      })
                    }
                    className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                      settings.glowIntensity === opt.id
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] text-stone-500 font-normal">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Bridge Visibility Settings */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-stone-200">
                <Eye className="w-4 h-4 text-amber-400/80" />
                <span>琴柱（ことじ）の表示設定</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                各弦を支える可動式の白象牙琴柱のディテール表現。簡易表示または非表示でSVGグラフィック負荷を大幅に軽減。
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(
                  [
                    { id: 'full', label: '本格 (リアル)', desc: '伝統木目・象牙質感' },
                    { id: 'simplified', label: '簡易 (軽量)', desc: '軽快ピラー表示' },
                    { id: 'hidden', label: '非表示', desc: '弦のみ表示' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() =>
                      onUpdateSettings({
                        ...settings,
                        bridgeVisibility: opt.id as BridgeVisibility,
                      })
                    }
                    className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                      settings.bridgeVisibility === opt.id
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] text-stone-500 font-normal">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 flex items-center justify-between bg-stone-950/60">
          <button
            onClick={() => onUpdateSettings(DEFAULT_VISUAL_SETTINGS)}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>初期設定に戻す</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs transition-colors shadow-sm"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};
