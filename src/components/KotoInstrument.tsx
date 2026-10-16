import React, { useRef, useState, useCallback, useEffect } from 'react';
import { KotoTuning, PlayingTechnique, LabelMode, VisualSettings } from '../types/koto';
import { KotoString } from './KotoString';
import { TECHNIQUE_LABELS } from './TechniqueBar';
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

  // 弦を光らせ、震わせる（音は鳴らさない）
  const flashString = useCallback((stringId: number) => {
    setActiveStrings((prev) => {
      const next = new Set(prev);
      next.add(stringId);
      return next;
    });
    const existingTimer = timeoutsRef.current.get(stringId);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => {
      setActiveStrings((prev) => {
        const next = new Set(prev);
        next.delete(stringId);
        return next;
      });
      timeoutsRef.current.delete(stringId);
    }, 1400);
    timeoutsRef.current.set(stringId, timer);
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
      flashString(stringId);

      if (onStringPlucked) {
        onStringPlucked(stringId);
      }
    },
    [activeTuning.strings, currentTechnique, onStringPlucked, flashString]
  );

  // Custom pluck event (e.g. from Glissando or Song Guide)
  useEffect(() => {
    // 引連・お手本再生は送り手が音を鳴らすので、ここでは光らせるだけ（二重に鳴らさない）
    const handleCustomPluck = (e: CustomEvent<{ stringId: number }>) => {
      flashString(e.detail.stringId);
    };
    window.addEventListener('koto:pluck' as unknown as keyof WindowEventMap, handleCustomPluck as EventListener);
    return () => {
      window.removeEventListener('koto:pluck' as unknown as keyof WindowEventMap, handleCustomPluck as EventListener);
    };
  }, [flashString]);

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


  // 指（マウス）の位置にある弦を、画面上の実際の弦の行から探す。
  // 琴柱の左右も、その弦の「糸の部分」の幅で判定する（名札や竜角の幅に影響されない）
  const getStringAtCoords = useCallback(
    (clientX: number, clientY: number): { id: number; isLeft: boolean } | null => {
      const hit = document.elementFromPoint(clientX, clientY);
      const row = hit ? (hit.closest('[data-string-id]') as HTMLElement | null) : null;
      if (!row || !boardRef.current || !boardRef.current.contains(row)) return null;
      const id = Number(row.dataset.stringId);
      const s = activeTuning.strings.find((item) => item.id === id);
      if (!s) return null;

      const track = row.querySelector('[data-track]') as HTMLElement | null;
      const r = (track || row).getBoundingClientRect();
      const ratio =
        orientation === 'horizontal'
          ? ((clientX - r.left) / r.width) * 100
          : ((clientY - r.top) / r.height) * 100;
      // 名札や竜角の上をタップしたときは琴柱の右側（通常の撥弦）として扱う
      const isLeft = ratio >= 0 && ratio <= 100 && ratio < s.bridgePositionPercent;
      return { id, isLeft };
    },
    [activeTuning.strings, orientation]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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
  };

  return (
    <div className="koto-board-wrap relative w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 select-none touch-none overflow-hidden">
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
            linear-gradient(105deg, rgba(255, 236, 190, 0) 0%, rgba(255, 236, 190, 0.16) 16%, rgba(255, 236, 190, 0) 32%),
            radial-gradient(ellipse at 50% 38%, rgba(234, 150, 40, 0.30) 0%, rgba(140, 62, 14, 0.45) 62%, rgba(36, 14, 4, 0.92) 100%),
            linear-gradient(135deg, #7c3a10 0%, #99480f 24%, #bb5d12 50%, #99480f 76%, #3f1904 100%)
          `,
          boxShadow:
            '0 30px 70px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(242, 196, 109, 0.28), 0 0 60px -10px rgba(217, 119, 6, 0.35), inset 0 2px 10px rgba(254, 240, 138, 0.2)',
        }}
      >
        {/* 桐の細かい木目（年輪）：太い綾杉彫りの上に、さらに細かい筋を重ねる */}
        <div
          className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
          style={{
            backgroundImage: `repeating-linear-gradient(
              ${orientation === 'horizontal' ? '0deg' : '90deg'},
              rgba(255, 220, 160, 0.5) 0px,
              transparent 1px,
              transparent 3px,
              rgba(40, 14, 2, 0.45) 4px,
              transparent 5px
            )`,
          }}
        />
        {/* 金の象嵌ライン（縁の内側の細い金線） */}
        <div className="absolute inset-[5px] rounded-[inherit] pointer-events-none z-30 border border-amber-300/20" />

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

        {/* いま発動している特殊奏法の表示（本手のときは出さない） */}
        {currentTechnique !== 'normal' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-3 py-0.5 rounded-full bg-stone-950/85 border border-amber-400/60 text-amber-200 text-xs font-serif-jp font-bold shadow-lg shadow-black/60">
            {TECHNIQUE_LABELS[currentTechnique]}
          </div>
        )}

        {/* Strings Container */}
        <div
          className={`relative w-full h-full flex z-10 ${
            orientation === 'horizontal' ? 'flex-col py-2.5 divide-y divide-amber-950/30' : 'flex-row divide-x divide-amber-950/30'
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
