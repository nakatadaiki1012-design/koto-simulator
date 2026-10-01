import React, { useRef, useState, useCallback, useEffect } from 'react';
import { KotoTuning, PlayingTechnique, LabelMode, VisualSettings } from '../types/koto';
import { KotoString } from './KotoString';
import { soundEngine } from '../utils/soundEngine';

interface KotoInstrumentProps {
  labelMode: LabelMode;
  showKeyBinds: boolean;
  orientation: 'horizontal' | 'vertical';
  currentGuideStringId: number | null;
  activeTuning: KotoTuning;
  currentTechnique: PlayingTechnique;
  visualSettings?: VisualSettings;
  onStringPlucked?: (stringId: number) => void;
}

export const KotoInstrument: React.FC<KotoInstrumentProps> = ({
  labelMode,
  showKeyBinds,
  orientation,
  currentGuideStringId,
  activeTuning,
  currentTechnique,
  visualSettings,
  onStringPlucked,
}) => {
  const [activeStrings, setActiveStrings] = useState<Set<number>>(new Set());
  const stringElementsRef = useRef<Map<number, HTMLElement>>(new Map());
  const activePointersRef = useRef<Map<number, number>>(new Map());
  const timeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const boardRef = useRef<HTMLDivElement>(null);

  const registerStringElement = useCallback((stringId: number, el: HTMLElement | null) => {
    if (el) {
      stringElementsRef.current.set(stringId, el);
    } else {
      stringElementsRef.current.delete(stringId);
    }
  }, []);

  const triggerPluck = useCallback(
    (stringId: number, isLeftSideOfBridge: boolean = false, velocity: number = 0.85) => {
      const stringData = activeTuning.strings.find((s) => s.id === stringId);
      if (!stringData) return;

      // If clicked left of the bridge and technique is normal, trigger authentic Ura-biki / Oshi-de
      let effectiveTechnique: PlayingTechnique = currentTechnique;
      if (isLeftSideOfBridge && currentTechnique === 'normal') {
        effectiveTechnique = 'urabiki';
      }

      // Play audio via zero-latency engine
      soundEngine.playString(stringId, stringData.frequency, velocity, effectiveTechnique);

      // Visual vibration trigger
      setActiveStrings((prev) => {
        const next = new Set(prev);
        next.add(stringId);
        return next;
      });

      const existingTimer = timeoutsRef.current.get(stringId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        setActiveStrings((prev) => {
          const next = new Set(prev);
          next.delete(stringId);
          return next;
        });
        timeoutsRef.current.delete(stringId);
      }, 1400);

      timeoutsRef.current.set(stringId, timer);

      if (onStringPlucked) {
        onStringPlucked(stringId);
      }
    },
    [activeTuning.strings, currentTechnique, onStringPlucked]
  );

  // Custom pluck event (e.g. from Glissando or Song Guide)
  useEffect(() => {
    const handleCustomPluck = (e: CustomEvent<{ stringId: number }>) => {
      triggerPluck(e.detail.stringId, false, 0.85);
    };
    window.addEventListener('koto:pluck' as unknown as keyof WindowEventMap, handleCustomPluck as EventListener);
    return () => {
      window.removeEventListener('koto:pluck' as unknown as keyof WindowEventMap, handleCustomPluck as EventListener);
    };
  }, [triggerPluck]);

  // Keyboard shortcut listener for Chromebook & PC students
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toUpperCase();
      const stringByDesktop = activeTuning.strings.find((s) => s.keyBindDesktop.toUpperCase() === key);
      const stringBySub = activeTuning.strings.find((s) => s.keyBindSub.toUpperCase() === key);
      const target = stringByDesktop || stringBySub;

      if (target) {
        e.preventDefault();
        triggerPluck(target.id, false, 0.88);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTuning.strings, triggerPluck]);

  const boardRectRef = useRef<DOMRect | null>(null);

  const getStringAtCoords = useCallback(
    (clientX: number, clientY: number): { id: number; isLeft: boolean } | null => {
      let rect = boardRectRef.current;
      if (!rect && boardRef.current) {
        rect = boardRef.current.getBoundingClientRect();
        boardRectRef.current = rect;
      }
      if (!rect) return null;

      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }

      const totalStrings = activeTuning.strings.length;
      if (orientation === 'horizontal') {
        const stringHeight = rect.height / totalStrings;
        const idx = Math.floor((clientY - rect.top) / stringHeight);
        if (idx >= 0 && idx < totalStrings) {
          const s = activeTuning.strings[idx];
          const xRatio = ((clientX - rect.left) / rect.width) * 100;
          const isLeft = xRatio < s.bridgePositionPercent;
          return { id: s.id, isLeft };
        }
      } else {
        const stringWidth = rect.width / totalStrings;
        const idx = Math.floor((clientX - rect.left) / stringWidth);
        if (idx >= 0 && idx < totalStrings) {
          const s = activeTuning.strings[idx];
          const yRatio = ((clientY - rect.top) / rect.height) * 100;
          const isLeft = yRatio < s.bridgePositionPercent;
          return { id: s.id, isLeft };
        }
      }

      return null;
    },
    [activeTuning.strings, orientation]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (boardRef.current) {
      boardRectRef.current = boardRef.current.getBoundingClientRect();
    }
    const result = getStringAtCoords(e.clientX, e.clientY);
    activePointersRef.current.set(e.pointerId, result ? result.id : -1);

    if (result !== null) {
      triggerPluck(result.id, result.isLeft, 0.88);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;

    const result = getStringAtCoords(e.clientX, e.clientY);
    const lastStringId = activePointersRef.current.get(e.pointerId);

    if (result !== null && result.id !== lastStringId) {
      activePointersRef.current.set(e.pointerId, result.id);
      triggerPluck(result.id, result.isLeft, 0.82);
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      boardRectRef.current = null;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 select-none touch-none overflow-hidden">
      {/* Koto Body Container (竜甲 / Ryukou) */}
      <div
        ref={boardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        className={`relative w-full h-full max-w-7xl max-h-[860px] rounded-2xl sm:rounded-3xl shadow-2xl border border-amber-900/60 overflow-hidden flex ${
          orientation === 'horizontal' ? 'flex-col' : 'flex-row'
        }`}
        style={{
          background: `
            radial-gradient(ellipse at 50% 40%, rgba(217, 119, 6, 0.24) 0%, rgba(120, 53, 15, 0.5) 70%, rgba(41, 16, 4, 0.9) 100%),
            linear-gradient(135deg, #78350f 0%, #92400e 25%, #b45309 50%, #92400e 75%, #451a03 100%)
          `,
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.95), inset 0 2px 10px rgba(254, 240, 138, 0.18)',
        }}
      >
        {/* Ayasugi-bori (綾杉彫り) fine woodgrain pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: `repeating-linear-gradient(
              ${orientation === 'horizontal' ? '0deg' : '90deg'},
              transparent,
              transparent 7px,
              rgba(69, 26, 3, 0.55) 8px,
              rgba(69, 26, 3, 0.35) 9px,
              transparent 13px
            )`,
          }}
        />

        {/* Lacquer borders */}
        {orientation === 'horizontal' ? (
          <>
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-b from-stone-950 to-amber-950/60 border-b border-amber-500/20 pointer-events-none z-30" />
            <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-t from-stone-950 to-amber-950/60 border-t border-amber-500/20 pointer-events-none z-30" />
            <div className="absolute left-0 inset-y-0 w-3 bg-gradient-to-r from-stone-950 via-amber-950 to-transparent pointer-events-none z-30 border-r border-amber-500/20" />
            <div className="absolute right-0 inset-y-0 w-3 bg-gradient-to-l from-stone-950 via-amber-950 to-transparent pointer-events-none z-30 border-l border-amber-500/20" />
          </>
        ) : (
          <>
            <div className="absolute left-0 inset-y-0 w-2 bg-gradient-to-r from-stone-950 to-amber-950/60 border-r border-amber-500/20 pointer-events-none z-30" />
            <div className="absolute right-0 inset-y-0 w-2 bg-gradient-to-l from-stone-950 to-amber-950/60 border-l border-amber-500/20 pointer-events-none z-30" />
            <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-b from-stone-950 via-amber-950 to-transparent pointer-events-none z-30 border-b border-amber-500/20" />
            <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-t from-stone-950 via-amber-950 to-transparent pointer-events-none z-30 border-t border-amber-500/20" />
          </>
        )}

        {/* Strings Container */}
        <div
          className={`relative w-full h-full flex z-10 ${
            orientation === 'horizontal' ? 'flex-col divide-y divide-amber-950/30' : 'flex-row divide-x divide-amber-950/30'
          }`}
        >
          {activeTuning.strings.map((stringData) => (
            <div key={stringData.id} className="relative flex-1 min-w-0 min-h-0 flex items-center justify-center">
              <KotoString
                stringData={stringData}
                labelMode={labelMode}
                showKeyBinds={showKeyBinds}
                isActive={activeStrings.has(stringData.id)}
                isGuideTarget={currentGuideStringId === stringData.id}
                orientation={orientation}
                visualSettings={visualSettings}
                onPluck={(id, isLeft) => triggerPluck(id, isLeft)}
                registerStringElement={registerStringElement}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
