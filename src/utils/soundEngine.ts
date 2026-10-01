/**
 * Web Audio API Synthesis Engine for Japanese 13-String Koto (十三弦 箏)
 *
 * Combines:
 * 1. Zero-latency pre-rendered Karplus-Strong physical modeling buffer cache
 * 2. Traditional Playing Techniques (特殊奏法):
 *    - 本手（通常）
 *    - 押し手（Oshi-de / +半音ピッチベンド）
 *    - 割爪・トレモロ（Tremolo）
 *    - 消音・ピチカート（Pizzicato）
 *    - 裏弾き（Ura-biki / 柱の左側）
 * 3. Sawari (サワリ) bridge notch buzz resonance & Paulownia cavity acoustics
 * 4. Sympathetic String Resonance (他弦共鳴)
 * 5. Japanese Room / Noh Stage Convolution Reverb
 * 6. Dual Glissando: 引連（上り）& 流し爪（下り）
 * 7. MediaStreamAudioDestinationNode real-time recording to 16-bit PCM WAV.
 */

import { audioBufferToWavBlob } from './wavEncoder';
import { synthesizeKotoString } from './karplusStrong';
import {
  ReverbEnvironment,
  REVERB_ENVIRONMENTS,
  createEnvironmentImpulseResponse,
} from './reverb';
import { unlockWebAudio } from './audioUnlock';
import { KotoStringData, KotoTuning, PlayingTechnique } from '../types/koto';
import { HIRAJOSHI } from '../data/tunings';

interface ActiveVoice {
  sourceNode: AudioBufferSourceNode;
  gainNode: GainNode;
  stopTime: number;
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number;
}

export type KotoStringType = 'silk' | 'tetron';

class KotoSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private reverbSendGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private activeVoices: Map<number, ActiveVoice[]> = new Map();
  private volume: number = 0.85;
  private isMuted: boolean = false;
  private initialized: boolean = false;

  // Timbre & Spatial settings
  private stringType: KotoStringType = 'silk';
  private reverbEnvironment: ReverbEnvironment = 'traditional_hall';
  private activeTuning: KotoTuning = HIRAJOSHI;
  private currentTechnique: PlayingTechnique = 'normal';
  private impulseCache: Map<ReverbEnvironment, AudioBuffer> = new Map();

  // Zero-latency cache: Map `${stringId}_${stringType}_${technique}` -> AudioBuffer
  private stringBufferCache: Map<string, AudioBuffer> = new Map();

  // Real-time Recording via MediaStreamAudioDestinationNode
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private streamSourceNode: MediaStreamAudioSourceNode | null = null;
  private captureProcessor: ScriptProcessorNode | null = null;
  private dummyGain: GainNode | null = null;
  private isCurrentlyRecording: boolean = false;
  private recordingStartTime: number = 0;
  private pcmChunksL: Float32Array[] = [];
  private pcmChunksR: Float32Array[] = [];

  constructor() {
    // Lazy initialization on user interaction
  }

  public async init(): Promise<boolean> {
    if (this.initialized && this.ctx && this.ctx.state === 'running') {
      return true;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx) {
        this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      }

      // Unlock Web Audio for iOS Silent Mode & Earphones
      await unlockWebAudio(this.ctx);

      const state = this.ctx.state as string;
      if (state === 'suspended' || state === 'interrupted') {
        try {
          await this.ctx.resume();
        } catch {
          // Will retry on user gesture
        }
      }

      // Listen for output device change (e.g. plugging in or connecting Bluetooth earphones)
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        navigator.mediaDevices.ondevicechange = async () => {
          if (this.ctx) {
            const s = this.ctx.state as string;
            if (s === 'suspended' || s === 'interrupted') {
              try {
                await this.ctx.resume();
              } catch {}
            }
            // Clear impulse cache if sample rate changed on headphone connection
            this.impulseCache.clear();
            this.loadReverbImpulse(this.reverbEnvironment);
          }
        };
      }

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

      // Dynamics compressor
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(3.5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.001, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      // Dry / Wet Routing
      const activeOpt = REVERB_ENVIRONMENTS.find((e) => e.id === this.reverbEnvironment);
      const initialWet = activeOpt ? activeOpt.wetLevel : 0.25;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.setValueAtTime(1.0 - initialWet * 0.35, this.ctx.currentTime);

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.setValueAtTime(initialWet, this.ctx.currentTime);

      // Convolver node with selected acoustic environment
      this.convolver = this.ctx.createConvolver();
      this.reverbSendGain = this.ctx.createGain();
      const sendVal = this.reverbEnvironment === 'off' ? 0.0 : 1.0;
      this.reverbSendGain.gain.setValueAtTime(sendVal, this.ctx.currentTime);

      this.loadReverbImpulse(this.reverbEnvironment);

      this.compressor.connect(this.dryGain);
      this.dryGain.connect(this.masterGain);

      // Route through reverbSendGain to completely bypass convolver when reverb is off
      this.compressor.connect(this.reverbSendGain);
      this.reverbSendGain.connect(this.convolver);
      this.convolver.connect(this.wetGain);
      this.wetGain.connect(this.masterGain);

      this.masterGain.connect(this.ctx.destination);

      // MediaStreamAudioDestinationNode for real-time recording
      if (this.ctx.createMediaStreamDestination) {
        this.mediaStreamDest = this.ctx.createMediaStreamDestination();
        this.masterGain.connect(this.mediaStreamDest);
      }

      // Pre-warm zero-latency buffer cache for all strings of active tuning
      this.warmupCache(this.activeTuning.strings);

      this.initialized = true;
      return true;
    } catch (err) {
      console.error('Failed to initialize AudioContext:', err);
      return false;
    }
  }

  private loadReverbImpulse(env: ReverbEnvironment): void {
    if (!this.ctx || !this.convolver || env === 'off') return;
    let buf = this.impulseCache.get(env);
    // Invalidate if sample rate changed due to Bluetooth headphones
    if (buf && buf.sampleRate !== this.ctx.sampleRate) {
      buf = undefined;
      this.impulseCache.delete(env);
    }

    if (!buf) {
      try {
        const generated = createEnvironmentImpulseResponse(this.ctx, env);
        if (generated) {
          buf = generated;
          this.impulseCache.set(env, generated);
        }
      } catch (err) {
        console.warn('Could not generate impulse response for environment:', env, err);
      }
    }
    if (buf) {
      try {
        this.convolver.buffer = buf;
      } catch (err) {
        console.warn('Convolver buffer assignment failed (sample rate mismatch?):', err);
      }
    }
  }

  /**
   * Pre-renders and caches physical modeling AudioBuffers to guarantee 0ms latency on pluck.
   * Only renders 'normal' technique synchronously (~15ms), and yields to browser idle loop
   * for alternate techniques so UI thread never drops frames.
   */
  public warmupCache(strings: KotoStringData[]): void {
    if (!this.ctx) return;

    // 1. Immediately warm up essential 'normal' technique (~15ms)
    for (const s of strings) {
      const cacheKey = `${s.id}_${this.stringType}_normal_${s.frequency}`;
      if (!this.stringBufferCache.has(cacheKey)) {
        const buf = synthesizeKotoString(this.ctx, {
          sampleRate: this.ctx.sampleRate,
          frequency: s.frequency,
          durationSeconds: 1.7,
          stringType: this.stringType,
          pluckHardness: 0.88,
          technique: 'normal',
          bridgePosPercent: s.bridgePositionPercent,
        });
        this.stringBufferCache.set(cacheKey, buf);
      }
    }

    // 2. Non-blocking slice scheduling for secondary techniques
    const remainingTechniques: PlayingTechnique[] = ['pizzicato', 'urabiki', 'sukui'];
    let techIdx = 0;
    let strIdx = 0;

    const scheduleNextSlice = () => {
      if (techIdx >= remainingTechniques.length || !this.ctx) return;
      const tech = remainingTechniques[techIdx];
      const s = strings[strIdx];

      if (s) {
        const cacheKey = `${s.id}_${this.stringType}_${tech}_${s.frequency}`;
        if (!this.stringBufferCache.has(cacheKey)) {
          const duration = tech === 'pizzicato' ? 0.45 : tech === 'urabiki' ? 1.1 : 1.5;
          const buf = synthesizeKotoString(this.ctx, {
            sampleRate: this.ctx.sampleRate,
            frequency: s.frequency,
            durationSeconds: duration,
            stringType: this.stringType,
            pluckHardness: tech === 'sukui' ? 0.95 : 0.88,
            technique: tech,
            bridgePosPercent: s.bridgePositionPercent,
          });
          this.stringBufferCache.set(cacheKey, buf);
        }
      }

      strIdx++;
      if (strIdx >= strings.length) {
        strIdx = 0;
        techIdx++;
      }

      if (techIdx < remainingTechniques.length) {
        setTimeout(scheduleNextSlice, 12);
      }
    };

    setTimeout(scheduleNextSlice, 60);
  }

  public isReady(): boolean {
    return this.initialized && this.ctx !== null && this.ctx.state === 'running';
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMute(mute: boolean): void {
    this.isMuted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : this.volume, this.ctx.currentTime, 0.02);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setStringType(type: KotoStringType): void {
    if (this.stringType === type) return;
    this.stringType = type;
    this.stringBufferCache.clear();
    if (this.ctx) {
      this.warmupCache(this.activeTuning.strings);
    }
  }

  public getStringType(): KotoStringType {
    return this.stringType;
  }

  public setReverbEnvironment(env: ReverbEnvironment): void {
    this.reverbEnvironment = env;
    if (!this.ctx || !this.wetGain || !this.dryGain) return;

    const activeEnvOpt = REVERB_ENVIRONMENTS.find((e) => e.id === env);
    const wet = activeEnvOpt ? activeEnvOpt.wetLevel : 0.0;
    const dry = env === 'off' ? 1.0 : 1.0 - wet * 0.35;

    if (env !== 'off') {
      this.loadReverbImpulse(env);
      if (this.reverbSendGain) {
        this.reverbSendGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.02);
      }
    } else {
      if (this.reverbSendGain) {
        this.reverbSendGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.02);
      }
    }

    this.wetGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.04);
    this.dryGain.gain.setTargetAtTime(dry, this.ctx.currentTime, 0.04);
  }

  public getReverbEnvironment(): ReverbEnvironment {
    return this.reverbEnvironment;
  }

  public setReverbEnabled(enabled: boolean): void {
    this.setReverbEnvironment(enabled ? 'traditional_hall' : 'off');
  }

  public isReverbEnabled(): boolean {
    return this.reverbEnvironment !== 'off';
  }

  public setPlayingTechnique(tech: PlayingTechnique): void {
    this.currentTechnique = tech;
  }

  public getPlayingTechnique(): PlayingTechnique {
    return this.currentTechnique;
  }

  public setTuning(tuning: KotoTuning): void {
    this.activeTuning = tuning;
    if (this.ctx) {
      this.warmupCache(tuning.strings);
    }
  }

  public getActiveTuning(): KotoTuning {
    return this.activeTuning;
  }

  /**
   * Instantly plucks a Koto string with zero latency
   * @param stringId String index (1 to 13)
   * @param frequency Fundamental frequency in Hz
   * @param velocity Plucking velocity (0.2 to 1.0)
   * @param overrideTechnique Optional override technique for this specific pluck
   */
  public playString(
    stringId: number,
    frequency: number,
    velocity: number = 0.85,
    overrideTechnique?: PlayingTechnique
  ): void {
    if (!this.ctx || !this.compressor || this.ctx.state === 'closed') {
      this.init().then((success) => {
        if (success) {
          this.playString(stringId, frequency, velocity, overrideTechnique);
        }
      });
      return;
    }

    // Auto-resume AudioContext if suspended (e.g. mobile tab switch or screen sleep)
    if (this.ctx.state === 'suspended' || this.ctx.state === 'interrupted') {
      this.ctx.resume().catch(() => {});
    }

    this.dispatchPluck(stringId, frequency, velocity, overrideTechnique);
  }

  private dispatchPluck(
    stringId: number,
    frequency: number,
    velocity: number,
    overrideTechnique?: PlayingTechnique
  ): void {
    const tech = overrideTechnique || this.currentTechnique;

    // Handle Tremolo: rapid repeat fluttering strikes
    if (tech === 'tremolo') {
      this.executeTremolo(stringId, frequency, velocity);
      return;
    }

    // Handle Awase-tsume: octave/harmonic dual pluck
    if (tech === 'awase') {
      this.executeAwase(stringId, frequency, velocity);
      return;
    }

    this.executePluck(stringId, frequency, velocity, tech);
  }

  private executePluck(
    stringId: number,
    frequency: number,
    velocity: number,
    tech: PlayingTechnique
  ): void {
    if (!this.ctx || !this.compressor) return;
    const now = this.ctx.currentTime;
    const vel = Math.max(0.2, Math.min(1.0, velocity));

    // Polyphony per string: smoothly damp previous voice of the exact same string
    const previousVoices = this.activeVoices.get(stringId);
    if (previousVoices && previousVoices.length > 0) {
      const voiceToDamp = previousVoices[previousVoices.length - 1];
      try {
        voiceToDamp.gainNode.gain.cancelScheduledValues(now);
        voiceToDamp.gainNode.gain.setTargetAtTime(0.0001, now, 0.015);
      } catch {
        // Safe timing fallback
      }
    }

    // 1. Fetch pre-rendered buffer from cache (Instant 0ms latency)
    const synthTech =
      tech === 'oshide' || tech === 'hikiiro' || tech === 'tsukiiro'
        ? 'normal'
        : tech;
    const cacheKey = `${stringId}_${this.stringType}_${synthTech}_${frequency}`;
    let buffer = this.stringBufferCache.get(cacheKey);

    if (!buffer) {
      const duration =
        synthTech === 'pizzicato'
          ? 0.5
          : synthTech === 'urabiki'
          ? 1.2
          : synthTech === 'sukui'
          ? 1.8
          : 2.2;
      buffer = synthesizeKotoString(this.ctx, {
        sampleRate: this.ctx.sampleRate,
        frequency,
        durationSeconds: duration,
        stringType: this.stringType,
        pluckHardness: synthTech === 'sukui' ? 0.95 : 0.88,
        technique: synthTech,
        bridgePosPercent: 50,
      });
      this.stringBufferCache.set(cacheKey, buffer);
    }

    // 2. Buffer source node
    const sourceNode = this.ctx.createBufferSource();
    sourceNode.buffer = buffer;

    // Pitch dynamic modulations for traditional left-hand techniques:
    if (tech === 'oshide') {
      // 押し手: smooth bend up by semitone (+100 cents)
      sourceNode.playbackRate.setValueAtTime(1.0, now);
      sourceNode.playbackRate.setValueAtTime(1.0, now + 0.035);
      sourceNode.playbackRate.exponentialRampToValueAtTime(1.05946, now + 0.30);
      sourceNode.playbackRate.linearRampToValueAtTime(1.055, now + 0.50);
      sourceNode.playbackRate.linearRampToValueAtTime(1.062, now + 0.70);
    } else if (tech === 'hikiiro') {
      // 引き色: string is already pressed when struck, then released gracefully down
      sourceNode.playbackRate.setValueAtTime(1.05946, now);
      sourceNode.playbackRate.setValueAtTime(1.05946, now + 0.06);
      sourceNode.playbackRate.exponentialRampToValueAtTime(1.0, now + 0.40);
    } else if (tech === 'tsukiiro') {
      // 突き色: momentary left-hand pressure accent on sustain (+40 cents dip and release)
      sourceNode.playbackRate.setValueAtTime(1.0, now);
      sourceNode.playbackRate.setValueAtTime(1.0, now + 0.08);
      sourceNode.playbackRate.linearRampToValueAtTime(1.026, now + 0.15);
      sourceNode.playbackRate.linearRampToValueAtTime(1.0, now + 0.28);
    } else {
      sourceNode.playbackRate.setValueAtTime(1.0 + (vel - 0.5) * 0.002, now);
    }

    // 3. Stereo Panner across the 13 strings
    const panRatio = ((stringId - 1) / 12) * 2 - 1;
    let pannerNode: StereoPannerNode | GainNode;
    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(panRatio * 0.32, now);
      pannerNode = panner;
    } else {
      pannerNode = this.ctx.createGain();
    }

    // 4. Voice Gain Envelope: bulletproof setTargetAtTime
    const voiceGain = this.ctx.createGain();
    const duration = buffer.duration;

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.linearRampToValueAtTime(1.15 * vel, now + 0.003); // 3ms attack
    voiceGain.gain.setTargetAtTime(0.0001, now + 0.04, Math.max(0.25, duration * 0.38));

    // Connect voice chain
    sourceNode.connect(voiceGain);
    voiceGain.connect(pannerNode);
    pannerNode.connect(this.compressor);

    sourceNode.start(0);
    sourceNode.stop(now + duration + 0.05);

    // 5. Sympathetic String Resonance (throttled to prevent CPU spikes)
    if (tech === 'normal' || tech === 'oshide') {
      let totalActive = 0;
      for (const list of this.activeVoices.values()) totalActive += list.length;
      if (totalActive < 6) {
        this.triggerSympatheticResonance(stringId, vel, now);
      }
    }

    // Polyphony Capping: limit concurrent voices to 12
    let totalVoices = 0;
    for (const list of this.activeVoices.values()) {
      totalVoices += list.length;
    }
    if (totalVoices > 12) {
      for (const list of this.activeVoices.values()) {
        if (list.length > 1) {
          const oldest = list.shift();
          if (oldest) {
            try {
              oldest.gainNode.gain.cancelScheduledValues(now);
              oldest.gainNode.gain.setTargetAtTime(0.0001, now, 0.01);
              oldest.sourceNode.stop(now + 0.015);
            } catch {
              // Ignore
            }
          }
        }
      }
    }

    // Track active voice
    const voiceEntry: ActiveVoice = { sourceNode, gainNode: voiceGain, stopTime: now + duration };
    const currentList = this.activeVoices.get(stringId) || [];
    currentList.push(voiceEntry);
    this.activeVoices.set(stringId, currentList);

    // Native Web Audio lifecycle cleanup (zero timer overhead)
    sourceNode.onended = () => {
      try {
        sourceNode.disconnect();
        voiceGain.disconnect();
        pannerNode.disconnect();
      } catch {
        // Disconnected
      }
      const list = this.activeVoices.get(stringId);
      if (list) {
        const filtered = list.filter((v) => v !== voiceEntry);
        if (filtered.length === 0) {
          this.activeVoices.delete(stringId);
        } else {
          this.activeVoices.set(stringId, filtered);
        }
      }
    };
  }

  /**
   * Executes traditional Tremolo (割爪 / 連打) technique
   */
  private executeTremolo(stringId: number, frequency: number, velocity: number): void {
    const repeatCount = 5;
    const intervalMs = 68;

    for (let i = 0; i < repeatCount; i++) {
      setTimeout(() => {
        const strikeVel = velocity * (i === 0 ? 0.95 : i % 2 === 0 ? 0.8 : 0.88);
        this.executePluck(stringId, frequency, strikeVel, 'normal');
      }, i * intervalMs);
    }
  }

  /**
   * Executes Awase-tsume (合わせ爪): simultaneously plucking target string with its octave/5th partner
   */
  private executeAwase(stringId: number, frequency: number, velocity: number): void {
    this.executePluck(stringId, frequency, velocity, 'normal');

    let partnerId = stringId <= 8 ? stringId + 5 : stringId - 5;
    if (partnerId < 1) partnerId = 1;
    if (partnerId > 13) partnerId = 13;

    const partner = this.activeTuning.strings.find((s) => s.id === partnerId);
    if (partner) {
      setTimeout(() => {
        this.executePluck(partner.id, partner.frequency, velocity * 0.9, 'normal');
      }, 6);
    }
  }

  /**
   * Sympathetic resonance across the hollow Paulownia soundboard
   */
  private triggerSympatheticResonance(playedId: number, velocity: number, now: number): void {
    if (!this.ctx || !this.compressor) return;

    const octaveMap: Record<number, number[]> = {
      1: [5, 10],
      2: [7, 12],
      3: [8, 13],
      4: [9],
      5: [1, 10],
      6: [11],
      7: [2, 12],
      8: [3, 13],
      9: [4],
      10: [1, 5],
      11: [6],
      12: [2, 7],
      13: [3, 8],
    };

    const targets = octaveMap[playedId];
    if (!targets || targets.length === 0) return;

    const sympatheticId = targets[0];
    const stringData = this.activeTuning.strings.find((s) => s.id === sympatheticId);
    if (!stringData) return;

    const cacheKey = `${sympatheticId}_${this.stringType}_normal_${stringData.frequency}`;
    const buffer = this.stringBufferCache.get(cacheKey);
    if (!buffer) return;

    const symSource = this.ctx.createBufferSource();
    symSource.buffer = buffer;

    const symGain = this.ctx.createGain();
    const symLevel = 0.045 * velocity;

    symGain.gain.setValueAtTime(0.0001, now);
    symGain.gain.linearRampToValueAtTime(symLevel, now + 0.05);
    symGain.gain.setTargetAtTime(0.0001, now + 0.08, 0.45);

    symSource.connect(symGain);
    symGain.connect(this.compressor);

    symSource.onended = () => {
      try {
        symSource.disconnect();
        symGain.disconnect();
      } catch {
        // Disconnected
      }
    };

    symSource.start(now + 0.02);
    symSource.stop(now + 1.85);
  }

  /**
   * Authentic Japanese Koto Glissando (引連・流し爪)
   * @param direction 'up' (引連 / Ascending 一->巾) or 'down' (流し爪 / Descending 巾->一)
   */
  public playGlissando(
    strings: KotoStringData[],
    direction: 'up' | 'down' = 'up',
    durationMs: number = 650,
    onNoteTriggered?: (id: number) => void
  ): void {
    this.init().then(() => {
      const ordered = direction === 'up' ? [...strings] : [...strings].reverse();
      const interval = durationMs / ordered.length;

      ordered.forEach((s, idx) => {
        setTimeout(() => {
          this.playString(s.id, s.frequency, 0.72 + (idx / ordered.length) * 0.22);
          if (onNoteTriggered) {
            onNoteTriggered(s.id);
          }
        }, idx * interval);
      });
    });
  }

  public async startRecording(): Promise<boolean> {
    await this.init();
    if (!this.ctx || !this.masterGain) return false;

    if (!this.mediaStreamDest && this.ctx.createMediaStreamDestination) {
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.mediaStreamDest);
    }

    if (!this.mediaStreamDest) {
      console.error('MediaStreamAudioDestinationNode not supported on this platform');
      return false;
    }

    this.pcmChunksL = [];
    this.pcmChunksR = [];
    this.recordingStartTime = Date.now();

    try {
      this.streamSourceNode = this.ctx.createMediaStreamSource(this.mediaStreamDest.stream);

      const bufferSize = 4096;
      this.captureProcessor = this.ctx.createScriptProcessor(bufferSize, 2, 2);
      this.captureProcessor.onaudioprocess = (e) => {
        if (!this.isCurrentlyRecording) return;
        const left = e.inputBuffer.getChannelData(0);
        const right = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : left;
        this.pcmChunksL.push(new Float32Array(left));
        this.pcmChunksR.push(new Float32Array(right));
      };

      this.dummyGain = this.ctx.createGain();
      this.dummyGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.streamSourceNode.connect(this.captureProcessor);
      this.captureProcessor.connect(this.dummyGain);
      this.dummyGain.connect(this.ctx.destination);

      this.isCurrentlyRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start recording stream:', err);
      return false;
    }
  }

  public async stopRecording(): Promise<RecordingResult | null> {
    if (!this.isCurrentlyRecording || !this.ctx) return null;
    this.isCurrentlyRecording = false;

    const duration = Math.max(0.1, (Date.now() - this.recordingStartTime) / 1000);

    if (this.captureProcessor) {
      this.captureProcessor.disconnect();
      this.captureProcessor.onaudioprocess = null;
      this.captureProcessor = null;
    }
    if (this.streamSourceNode) {
      this.streamSourceNode.disconnect();
      this.streamSourceNode = null;
    }
    if (this.dummyGain) {
      this.dummyGain.disconnect();
      this.dummyGain = null;
    }

    const totalSamples = this.pcmChunksL.reduce((acc, chunk) => acc + chunk.length, 0);
    if (totalSamples === 0) return null;

    const audioBuffer = this.ctx.createBuffer(2, totalSamples, this.ctx.sampleRate);
    const channelL = audioBuffer.getChannelData(0);
    const channelR = audioBuffer.getChannelData(1);

    let offset = 0;
    for (let i = 0; i < this.pcmChunksL.length; i++) {
      channelL.set(this.pcmChunksL[i], offset);
      channelR.set(this.pcmChunksR[i], offset);
      offset += this.pcmChunksL[i].length;
    }

    this.pcmChunksL = [];
    this.pcmChunksR = [];

    const wavBlob = audioBufferToWavBlob(audioBuffer);
    const url = URL.createObjectURL(wavBlob);

    return {
      blob: wavBlob,
      url,
      duration,
    };
  }

  public isRecording(): boolean {
    return this.isCurrentlyRecording;
  }
}

export const soundEngine = new KotoSoundEngine();
