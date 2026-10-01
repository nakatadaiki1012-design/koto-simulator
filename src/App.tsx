/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { HIRAJOSHI } from './data/tunings';
import { soundEngine, RecordingResult } from './utils/soundEngine';

export default function App() {
  const [labelMode, setLabelMode] = useState<LabelMode>('kanji');
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [showKeyBinds, setShowKeyBinds] = useState<boolean>(true);
  const [songGuideActive, setSongGuideActive] = useState<boolean>(false);
  const [currentGuideStringId, setCurrentGuideStringId] = useState<number | null>(null);
  const [lastPluckedStringId, setLastPluckedStringId] = useState<number | null>(null);
  const [isTuningModalOpen, setIsTuningModalOpen] = useState<boolean>(false);

  // Tuning & Playing Technique
  const [activeTuning, setActiveTuning] = useState<KotoTuning>(HIRAJOSHI);
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
      setOrientation('vertical');
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
    <div className="relative w-screen h-screen flex flex-col bg-stone-950 text-stone-100 overflow-hidden select-none">
      {/* 1. Header Bar */}
      <Header
        labelMode={labelMode}
        setLabelMode={setLabelMode}
        orientation={orientation}
        setOrientation={setOrientation}
        showKeyBinds={showKeyBinds}
        setShowKeyBinds={setShowKeyBinds}
        songGuideActive={songGuideActive}
        setSongGuideActive={setSongGuideActive}
        activeTuning={activeTuning}
        setActiveTuning={setActiveTuning}
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
          activeTuning={activeTuning}
          onSelectTuning={(tuning) => {
            setActiveTuning(tuning);
            soundEngine.setTuning(tuning);
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
          activeTuning={activeTuning}
          currentTechnique={currentTechnique}
          visualSettings={visualSettings}
          onStringPlucked={handleStringPlucked}
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
