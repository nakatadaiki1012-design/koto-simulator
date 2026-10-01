import React, { useRef, useEffect } from 'react';
import { KotoStringData, LabelMode, VisualSettings } from '../types/koto';

interface KotoStringProps {
  stringData: KotoStringData;
  labelMode: LabelMode;
  showKeyBinds: boolean;
  isActive: boolean;
  isGuideTarget: boolean;
  orientation: 'horizontal' | 'vertical';
  visualSettings?: VisualSettings;
  onPluck: (stringId: number, isLeftSideOfBridge?: boolean) => void;
  registerStringElement: (stringId: number, el: HTMLElement | null) => void;
}

const KotoStringComponent: React.FC<KotoStringProps> = ({
  stringData,
  labelMode,
  showKeyBinds,
  isActive,
  isGuideTarget,
  orientation,
  visualSettings,
  onPluck,
  registerStringElement,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerStringElement(stringData.id, containerRef.current);
    return () => {
      registerStringElement(stringData.id, null);
    };
  }, [stringData.id, registerStringElement]);

  const getLabelText = () => {
    switch (labelMode) {
      case 'kanji':
        return stringData.kanji;
      case 'doremi':
        return stringData.doremi;
      case 'western':
        return stringData.westernPitch;
      default:
        return stringData.kanji;
    }
  };

  const getSubLabelText = () => {
    if (labelMode === 'kanji') return stringData.westernPitch;
    if (labelMode === 'doremi') return stringData.kanji;
    return stringData.kanji;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    let isLeftSide = false;

    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      if (orientation === 'horizontal') {
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const clickRatioPercent = (clickX / width) * 100;
        isLeftSide = clickRatioPercent < stringData.bridgePositionPercent;
      } else {
        const clickY = e.clientY - rect.top;
        const height = rect.height;
        const clickRatioPercent = (clickY / height) * 100;
        isLeftSide = clickRatioPercent < stringData.bridgePositionPercent;
      }
    }

    onPluck(stringData.id, isLeftSide);
  };

  // Visual settings defaults
  const vibrationEnabled = visualSettings ? visualSettings.vibrationAnimation : true;
  const glowLevel = visualSettings ? visualSettings.glowIntensity : 'vivid';
  const bridgeVisibility = visualSettings ? visualSettings.bridgeVisibility : 'full';

  // Dynamic box shadow based on glow intensity
  const getStringBoxShadow = (isHoriz: boolean) => {
    if (isActive) {
      if (glowLevel === 'vivid') {
        return isHoriz
          ? '0 0 14px rgba(251, 191, 36, 0.95), 0 2px 5px rgba(0,0,0,0.6)'
          : '0 0 14px rgba(251, 191, 36, 0.95), 2px 0 5px rgba(0,0,0,0.6)';
      }
      if (glowLevel === 'subtle') {
        return isHoriz
          ? '0 0 5px rgba(251, 191, 36, 0.6), 0 1px 3px rgba(0,0,0,0.6)'
          : '0 0 5px rgba(251, 191, 36, 0.6), 1px 0 3px rgba(0,0,0,0.6)';
      }
      return isHoriz ? '0 1px 2px rgba(0,0,0,0.7)' : '1px 0 2px rgba(0,0,0,0.7)';
    }
    return isHoriz ? '0 1px 3px rgba(0,0,0,0.7)' : '1px 0 3px rgba(0,0,0,0.7)';
  };

  if (orientation === 'horizontal') {
    return (
      <div
        ref={containerRef}
        data-string-id={stringData.id}
        className={`relative flex items-center w-full h-full select-none cursor-pointer group transition-colors duration-150 ${
          isGuideTarget ? 'bg-amber-500/10' : ''
        }`}
        onPointerDown={handlePointerDown}
      >
        {/* Left Label Plate */}
        <div className="w-16 sm:w-20 md:w-24 shrink-0 flex items-center justify-center pl-2 sm:pl-4 z-20 pointer-events-none">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border transition-all duration-200 ${
              isActive
                ? `bg-amber-400 text-stone-950 border-amber-300 scale-105 ${
                    glowLevel === 'vivid'
                      ? 'shadow-md shadow-amber-500/30'
                      : glowLevel === 'subtle'
                      ? 'shadow-sm shadow-amber-500/20'
                      : ''
                  }`
                : isGuideTarget
                ? `bg-amber-500/30 text-amber-200 border-amber-400/80 animate-pulse ${
                    glowLevel !== 'off' ? 'shadow-sm' : ''
                  }`
                : 'bg-stone-900/80 text-stone-200 border-stone-700/60 shadow-inner'
            }`}
          >
            <span className="font-serif-jp text-base sm:text-lg font-bold tracking-tight">
              {getLabelText()}
            </span>
            <span className="text-[10px] text-stone-400 font-mono">
              {getSubLabelText()}
            </span>
          </div>

          {showKeyBinds && (
            <span className="ml-1.5 hidden sm:inline-block px-1 py-0.5 text-[9px] font-mono rounded bg-stone-800 text-stone-400 border border-stone-700">
              {stringData.keyBindDesktop}
            </span>
          )}
        </div>

        {/* String Track Area */}
        <div ref={trackRef} className="relative flex-1 h-full flex items-center">
          <div className="absolute inset-y-0 w-full hover:bg-amber-500/5 transition-colors" />

          {/* Pluck Glow Ripple (Disabled in 'off' mode for performance) */}
          {isActive && glowLevel !== 'off' && (
            <div
              className={`absolute inset-x-0 h-4 bg-gradient-to-r from-transparent via-amber-400/${
                glowLevel === 'vivid' ? '30' : '15'
              } to-transparent blur-sm pointer-events-none animate-pulse`}
            />
          )}

          {/* Physical String */}
          <div
            className={`w-full relative rounded-full transition-transform ${
              isActive && vibrationEnabled ? 'animate-string-vibrate' : ''
            }`}
            style={{
              height: `${stringData.stringThicknessPx}px`,
              background: isActive
                ? 'linear-gradient(90deg, #fef08a 0%, #ffffff 50%, #fef08a 100%)'
                : 'linear-gradient(90deg, #ebd6b3 0%, #fef8ee 40%, #e8d0a7 100%)',
              boxShadow: getStringBoxShadow(true),
            }}
          />

          {/* 琴柱 (Ji / Bridge) with realistic physical sliding animation */}
          {bridgeVisibility !== 'hidden' && (
            <div
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10"
              style={{
                left: `${stringData.bridgePositionPercent}%`,
                transition: 'left 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {bridgeVisibility === 'simplified' ? (
                /* Ultra-lightweight 2D minimal pillar */
                <div className="relative -translate-x-1/2 flex items-center justify-center">
                  <div className="w-1.5 h-6 bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 rounded-sm border border-amber-950/70" />
                </div>
              ) : (
                /* Full Realistic Ivory Bridge */
                <div className="relative -translate-x-1/2 flex flex-col items-center">
                  {glowLevel !== 'off' && (
                    <div className="absolute top-5 w-7 h-2.5 bg-black/60 blur-[2px] rounded-full" />
                  )}
                  <svg width="24" height="28" viewBox="0 0 24 28" className={glowLevel !== 'off' ? 'drop-shadow-md' : ''}>
                    <path
                      d="M 2,26 C 5,26 6,22 12,22 C 18,22 19,26 22,26 L 17,9 L 7,9 Z"
                      fill="url(#bridgeIvoryGradH)"
                      stroke="#78350f"
                      strokeWidth="0.6"
                    />
                    <path
                      d="M 7,9 L 12,2 L 17,9 C 15,6 9,6 7,9 Z"
                      fill="#fffbeb"
                      stroke="#92400e"
                      strokeWidth="0.6"
                    />
                    <circle cx="12" cy="5.5" r="1.5" fill="#451a03" />
                    <defs>
                      <linearGradient id="bridgeIvoryGradH" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fef3c7" />
                        <stop offset="35%" stopColor="#fffbeb" />
                        <stop offset="70%" stopColor="#fde68a" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Plucking Zone Indicator (竜角 / Ryukaku) */}
        <div className="w-14 sm:w-16 shrink-0 h-full flex items-center justify-center border-l border-amber-950/40 bg-stone-950/30 z-20 pointer-events-none">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
              isActive
                ? `bg-amber-400 scale-150 ${
                    glowLevel === 'vivid'
                      ? 'shadow-md shadow-amber-400'
                      : glowLevel === 'subtle'
                      ? 'shadow-sm shadow-amber-400'
                      : ''
                  }`
                : 'bg-stone-700/60'
            }`}
          />
        </div>
      </div>
    );
  }

  // Vertical Layout
  return (
    <div
      ref={containerRef}
      data-string-id={stringData.id}
      className={`relative flex flex-col items-center h-full w-full select-none cursor-pointer group transition-colors duration-150 ${
        isGuideTarget ? 'bg-amber-500/10' : ''
      }`}
      onPointerDown={handlePointerDown}
    >
      {/* Top Label Plate */}
      <div className="w-full shrink-0 flex flex-col items-center justify-center pt-2 pb-1 z-20 pointer-events-none">
        <div
          className={`flex flex-col items-center justify-center w-8 sm:w-10 py-1 rounded-sm border transition-all duration-200 ${
            isActive
              ? `bg-amber-400 text-stone-950 border-amber-300 scale-105 ${
                  glowLevel === 'vivid'
                    ? 'shadow-md shadow-amber-500/30'
                    : glowLevel === 'subtle'
                    ? 'shadow-sm shadow-amber-500/20'
                    : ''
                }`
              : isGuideTarget
              ? `bg-amber-500/30 text-amber-200 border-amber-400/80 animate-pulse ${
                  glowLevel !== 'off' ? 'shadow-sm' : ''
                }`
              : 'bg-stone-900/80 text-stone-200 border-stone-700/60 shadow-inner'
          }`}
        >
          <span className="font-serif-jp text-sm sm:text-base font-bold leading-tight">
            {getLabelText()}
          </span>
          <span className="text-[9px] text-stone-400 font-mono mt-0.5 leading-none">
            {getSubLabelText()}
          </span>
        </div>

        {showKeyBinds && (
          <span className="mt-1 px-1 py-0.2 text-[8px] font-mono rounded bg-stone-800 text-stone-400 border border-stone-700">
            {stringData.keyBindDesktop}
          </span>
        )}
      </div>

      {/* Vertical Track Area */}
      <div ref={trackRef} className="relative flex-1 w-full flex justify-center items-center">
        <div className="absolute inset-x-0 h-full hover:bg-amber-500/5 transition-colors" />

        {/* Pluck Glow Ripple */}
        {isActive && glowLevel !== 'off' && (
          <div
            className={`absolute inset-y-0 w-4 bg-gradient-to-b from-transparent via-amber-400/${
              glowLevel === 'vivid' ? '30' : '15'
            } to-transparent blur-sm pointer-events-none animate-pulse`}
          />
        )}

        <div
          className={`h-full relative rounded-full transition-transform ${
            isActive && vibrationEnabled ? 'animate-string-vibrate-x' : ''
          }`}
          style={{
            width: `${stringData.stringThicknessPx}px`,
            background: isActive
              ? 'linear-gradient(180deg, #fef08a 0%, #ffffff 50%, #fef08a 100%)'
              : 'linear-gradient(180deg, #ebd6b3 0%, #fef8ee 40%, #e8d0a7 100%)',
            boxShadow: getStringBoxShadow(false),
          }}
        />

        {/* 琴柱 (Ji / Bridge) with realistic physical sliding animation */}
        {bridgeVisibility !== 'hidden' && (
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-10"
            style={{
              top: `${stringData.bridgePositionPercent}%`,
              transition: 'top 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {bridgeVisibility === 'simplified' ? (
              /* Ultra-lightweight 2D minimal pillar */
              <div className="relative -translate-y-1/2 flex items-center justify-center">
                <div className="w-6 h-1.5 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-300 rounded-sm border border-amber-950/70" />
              </div>
            ) : (
              /* Full Realistic Ivory Bridge */
              <div className="relative -translate-y-1/2 flex items-center justify-center">
                {glowLevel !== 'off' && (
                  <div className="absolute left-3 w-2.5 h-6 bg-black/60 blur-[2px] rounded-full" />
                )}
                <svg width="26" height="22" viewBox="0 0 26 22" className={glowLevel !== 'off' ? 'drop-shadow-md' : ''}>
                  <path
                    d="M 26,2 C 26,5 22,6 22,12 C 22,18 26,19 26,22 L 9,17 L 9,7 Z"
                    fill="url(#bridgeIvoryGradV)"
                    stroke="#78350f"
                    strokeWidth="0.6"
                  />
                  <path
                    d="M 9,7 L 2,12 L 9,17 C 6,15 6,9 9,7 Z"
                    fill="#fffbeb"
                    stroke="#92400e"
                    strokeWidth="0.6"
                  />
                  <circle cx="13" cy="3.5" r="1.3" fill="#451a03" />
                    <defs>
                      <linearGradient id="bridgeIvoryGradV" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fffbeb" />
                        <stop offset="50%" stopColor="#fef3c7" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Bottom Plucking Zone Indicator (竜角 / Ryukaku) */}
      <div className="h-10 w-full shrink-0 flex items-center justify-center border-t border-amber-950/40 bg-stone-950/30 z-20 pointer-events-none">
        <div
          className={`w-2 h-2 rounded-full transition-all duration-150 ${
            isActive
              ? `bg-amber-400 scale-150 ${
                  glowLevel === 'vivid'
                    ? 'shadow-md shadow-amber-400'
                    : glowLevel === 'subtle'
                    ? 'shadow-sm shadow-amber-400'
                    : ''
                }`
              : 'bg-stone-700/60'
          }`}
        />
      </div>
    </div>
  );
};

export const KotoString = React.memo(KotoStringComponent);
