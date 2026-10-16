/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { TechniqueBar } from './components/TechniqueBar';
import { KotoInstrument } from './components/KotoInstrument';
import { SongGuideBar } from './components/SongGuideBar';
import { TuningModal } from './components/TuningModal';
import { LandscapeTip } from './components/LandscapeTip';
import { RecordingDialog } from './components/RecordingDialog';
import { VisualSettingsModal } from './components/VisualSettingsModal';
import {
  LabelMode,
  KotoTuning,
  PlayingTechnique,
  VisualSettings,
  DEFAULT_VISUAL_SETTINGS,
} from './types/koto';
import { HIRAJOSHI, applyOctaveUp } from './data/tunings';
import { soundEngine, RecordingResult } from './utils/soundEngine';

export default function App() {
  const [labelMode, setLabelMode] = useState<LabelMode>('kanji');
  const [orientation, setOrientationState] = useState<'horizontal' | 'vertical'>('horizontal');

  // 立体ビュー（横置きのときだけ使える）。設定と傾きはブラウザに保存
  const [view3d, setView3dState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('koto_view3d') === '1';
    } catch {
      return false;
    }
  });
  const [tilt, setTiltState] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('koto_tilt'));
      return v >= 15 && v <= 55 ? v : 38;
    } catch {
      return 38;
    }
  });
  const setView3d = (val: boolean) => {
    setView3dState(val);
    if (val) setOrientationState('horizontal');
    try {
      localStorage.setItem('koto_view3d', val ? '1' : '0');
    } catch {}
  };
  const setTilt = (deg: number) => {
    setTiltState(deg);
    try {
      localStorage.setItem('koto_tilt', String(deg));
    } catch {}
  };
  // 縦置きにしたら立体ビューは自動で切る
  const setOrientation = (o: 'horizontal' | 'vertical') => {
    setOrientationState(o);
    if (o === 'vertical' && view3d) setView3d(false);
  };
  const [showKeyBinds, setShowKeyBinds] = useState<boolean>(true);
  const [songGuideActive, setSongGuideActive] = useState<boolean>(false);
  const [currentGuideStringId, setCurrentGuideStringId] = useState<number | null>(null);
  const [lastPluckedStringId, setLastPluckedStringId] = useState<number | null>(null);
  const [isTuningModalOpen, setIsTuningModalOpen] = useState<boolean>(false);

  // Tuning & Playing Technique
  const [activeTuning, setActiveTuning] = useState<KotoTuning>(HIRAJOSHI);
  // 一弦をオクターブ上げる設定（ブラウザに保存して次回も引き継ぐ）
  const [firstStringOctaveUp, setFirstStringOctaveUp] = useState<boolean>(() => {
    try {
      return localStorage.getItem('koto_first_string_octave_up') === '1';
    } catch {
      return false;
    }
  });
  const handleFirstStringOctaveUp = (val: boolean) => {
    setFirstStringOctaveUp(val);
    try {
      localStorage.setItem('koto_first_string_octave_up', val ? '1' : '0');
    } catch {}
  };

  // 設定を反映した「実際に使う調弦」。音・琴柱の位置・練習ガイドはすべてこれを見る
  const effectiveTuning = useMemo(
    () => applyOctaveUp(activeTuning, firstStringOctaveUp ? [1] : []),
    [activeTuning, firstStringOctaveUp]
  );
  useEffect(() => {
    soundEngine.setTuning(effectiveTuning);
  }, [effectiveTuning]);

  const [currentTechnique, setCurrentTechnique] = useState<PlayingTechnique>('normal');

  // Recording State
  const [latestRecording, setLatestRecording] = useState<RecordingResult | null>(null);
  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = useState<boolean>(false);

  // Visual Feedback Settings (String vibration, glow intensity, bridge visibility)
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(() => {
    try {
      const saved = localStorage.getItem('koto_visual_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_VISUAL_SETTINGS;
  });
  const [isVisualSettingsModalOpen, setIsVisualSettingsModalOpen] = useState<boolean>(false);

  const handleUpdateVisualSettings = (newSettings: VisualSettings) => {
    setVisualSettings(newSettings);
    try {
      localStorage.setItem('koto_visual_settings', JSON.stringify(newSettings));
    } catch {}
  };

  // Auto-detect mobile portrait orientation on mount
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const isPortrait = window.innerHeight > window.innerWidth;
    if (isMobile && isPortrait) {
      setOrientationState('vertical');
    }
  }, []);

  // Safe lazy audio init on any initial user touch or click (including earphones & iOS silent mode)
  useEffect(() => {
    const events = ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'];

    const handleFirstGesture = () => {
      soundEngine.init();
      events.forEach((evt) => window.removeEventListener(evt, handleFirstGesture));
    };

    events.forEach((evt) => window.addEventListener(evt, handleFirstGesture, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleFirstGesture));
    };
  }, []);

  const handleStringPlucked = useCallback(
    (stringId: number) => {
      if (songGuideActive) {
        setLastPluckedStringId(stringId);
      }
    },
    [songGuideActive]
  );

  const handleRecordingComplete = useCallback((result: RecordingResult) => {
    setLatestRecording(result);
    setIsRecordingDialogOpen(true);
  }, []);

  const handleTechniqueChange = (tech: PlayingTechnique) => {
    setCurrentTechnique(tech);
    soundEngine.setPlayingTechnique(tech);
  };

  return (
    <div className="koto-stage relative w-screen h-screen flex flex-col bg-stone-950 text-stone-100 overflow-hidden select-none">
      {/* 1. Header Bar */}
      <Header
        labelMode={labelMode}
        setLabelMode={setLabelMode}
        orientation={orientation}
        setOrientation={setOrientation}
        view3d={view3d && orientation === 'horizontal'}
        setView3d={setView3d}
        showKeyBinds={showKeyBinds}
        setShowKeyBinds={setShowKeyBinds}
        songGuideActive={songGuideActive}
        setSongGuideActive={setSongGuideActive}
        activeTuning={effectiveTuning}
        setActiveTuning={setActiveTuning}
        firstStringOctaveUp={firstStringOctaveUp}
        setFirstStringOctaveUp={handleFirstStringOctaveUp}
        onOpenTuningModal={() => setIsTuningModalOpen(true)}
        onRecordingComplete={handleRecordingComplete}
        hasRecording={latestRecording !== null}
        onOpenRecordingDialog={() => setIsRecordingDialogOpen(true)}
        onOpenVisualSettingsModal={() => setIsVisualSettingsModalOpen(true)}
      />

      {/* 2. Traditional Special Playing Techniques Bar (特殊奏法: 本手・押し手・割爪・消音・裏弾き) */}
      <TechniqueBar
        currentTechnique={currentTechnique}
        onChangeTechnique={handleTechniqueChange}
      />

      {/* 3. Interactive Song Practice Bar (When Activated) */}
      {songGuideActive && (
        <SongGuideBar
          labelMode={labelMode}
          onTargetStringChange={setCurrentGuideStringId}
          onClose={() => setSongGuideActive(false)}
          lastPluckedStringId={lastPluckedStringId}
          activeTuning={effectiveTuning}
          onSelectTuning={(tuning) => {
            setActiveTuning(tuning);
          }}
        />
      )}

      {/* 4. Main Musical Instrument Stage */}
      <main className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center p-1 sm:p-3 overflow-hidden">
        <KotoInstrument
          labelMode={labelMode}
          showKeyBinds={showKeyBinds}
          orientation={orientation}
          currentGuideStringId={currentGuideStringId}
          activeTuning={effectiveTuning}
          currentTechnique={currentTechnique}
          visualSettings={visualSettings}
          onStringPlucked={handleStringPlucked}
          view3d={view3d}
          tilt={tilt}
          onTiltChange={setTilt}
        />
      </main>

      {/* 5. Mobile Landscape Tip Toast */}
      <LandscapeTip
        orientation={orientation}
        setOrientation={setOrientation}
      />

      {/* 6. Educational Reference & Tuning Modal */}
      <TuningModal
        isOpen={isTuningModalOpen}
        onClose={() => setIsTuningModalOpen(false)}
      />

      {/* 7. Visual Feedback Settings Modal */}
      <VisualSettingsModal
        isOpen={isVisualSettingsModalOpen}
        onClose={() => setIsVisualSettingsModalOpen(false)}
        settings={visualSettings}
        onUpdateSettings={handleUpdateVisualSettings}
      />

      {/* 8. Recording Result & WAV Download Dialog */}
      {isRecordingDialogOpen && latestRecording && (
        <RecordingDialog
          recording={latestRecording}
          onClose={() => setIsRecordingDialogOpen(false)}
          onClear={() => {
            if (latestRecording?.url) {
              URL.revokeObjectURL(latestRecording.url);
            }
            setLatestRecording(null);
            setIsRecordingDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
