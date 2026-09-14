// Zero-dependency Comprehensive Audio Synthesizer utilizing the Web Audio API
// Features: Layered harmonics, dynamic compression limiter, and contextual neuro-soundscapes

let audioCtx: AudioContext | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;
let isSoundMuted = false;

// Initialize mute state from localStorage if available
try {
  const saved = localStorage.getItem('reflex_sound_muted');
  if (saved !== null) {
    isSoundMuted = saved === 'true';
  }
} catch {
  // Ignore storage exceptions
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Master limiter to prevent distortion and clipping when sounds overlap
function getMasterNode(ctx: AudioContext): AudioNode {
  if (!masterCompressor) {
    try {
      masterCompressor = ctx.createDynamicsCompressor();
      masterCompressor.threshold.setValueAtTime(-12, ctx.currentTime);
      masterCompressor.knee.setValueAtTime(30, ctx.currentTime);
      masterCompressor.ratio.setValueAtTime(12, ctx.currentTime);
      masterCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
      masterCompressor.release.setValueAtTime(0.15, ctx.currentTime);
      masterCompressor.connect(ctx.destination);
    } catch {
      return ctx.destination;
    }
  }
  return masterCompressor;
}

export function isAudioMuted(): boolean {
  return isSoundMuted;
}

export function setAudioMuted(muted: boolean): void {
  isSoundMuted = muted;
  try {
    localStorage.setItem('reflex_sound_muted', String(muted));
  } catch {
    // Ignore storage exceptions
  }
}

// ==========================================
// 1. TACTILE & UI INTERACTION SOUNDS
// ==========================================

export function playTactileClick(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  } catch {
    // Silently handle
  }
}

export function playButtonPress(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {
    // Silently handle
  }
}

// Crisp glass-like tap when selecting a ball
export function playSelectionTap(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.04);

    // Harmonic octave shimmer
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2360, now);
    osc2.frequency.exponentialRampToValueAtTime(1160, now + 0.03);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.05);
    osc2.stop(now + 0.05);
  } catch {
    // Silently handle
  }
}

// Gentle low tone when deselecting a ball
export function playDeselectTap(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    // Silently handle
  }
}

let lastCollisionSoundTime = 0;
const COLLISION_SOUND_COOLDOWN_MS = 55;

export function playCollisionTap(volumeScale = 1.0): void {
  if (isSoundMuted) return;
  const nowMs = performance.now();
  if (nowMs - lastCollisionSoundTime < COLLISION_SOUND_COOLDOWN_MS) {
    return;
  }
  lastCollisionSoundTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Dynamic frequency variation between 320 Hz - 480 Hz
    const freq = 320 + Math.random() * 160;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.03);

    const baseGain = Math.min(0.08 * Math.max(0.2, volumeScale), 0.12);
    gain.gain.setValueAtTime(baseGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

    osc.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // Silently handle
  }
}

// Double chime ring when user reaches exact target quota
export function playQuotaLockCue(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const freqs = [880, 1320]; // A5 and E6 harmony
    freqs.forEach((freq, idx) => {
      const startTime = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.13, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(getMasterNode(ctx));

      osc.start(startTime);
      osc.stop(startTime + 0.11);
    });
  } catch {
    // Silently handle
  }
}

// ==========================================
// 2. STIMULUS & TRACKING PHASE SOUNDS
// ==========================================

export function playStimulusBeep(frequency = 880, duration = 0.22): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  } catch {
    // Silently handle
  }
}

// Shimmering ambient chord when target balls light up in highlight phase
export function playTargetHighlightCue(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Radiant Major Triad: C5, E5, G5, C6
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const delay = idx * 0.035;
      const startTime = now + delay;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.09, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.38);

      osc.connect(gain);
      gain.connect(getMasterNode(ctx));

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch {
    // Silently handle
  }
}

// Sweeping whoosh when balls disperse and begin moving
export function playMotionWhoosh(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.32);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.32);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Silently handle
  }
}

// Clear high chime when balls halt and selection opens
export function playBallsHaltCue(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start(now);
    osc.stop(now + 0.23);
  } catch {
    // Silently handle
  }
}

// ==========================================
// 3. FEEDBACK & CELEBRATION SOUNDS
// ==========================================

export function playSuccessChime(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, index) => {
      const startTime = ctx.currentTime + index * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(getMasterNode(ctx));

      osc.start(startTime);
      osc.stop(startTime + 0.21);
    });
  } catch {
    // Silently handle
  }
}

// Dynamic ascending arpeggio with base pitch scaling according to level
export function playLevelClearFanfare(level = 1): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Scale root pitch gently with level capped at level 10
    const baseFreq = 440 * Math.pow(1.04, Math.min(level, 10));
    const multipliers = [1.0, 1.25, 1.5, 2.0]; // Tonic, Major 3rd, 5th, Octave

    multipliers.forEach((mult, index) => {
      const startTime = now + index * 0.065;
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = baseFreq * mult;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Sweet subtle sine octave layer
      oscHarmonic.type = 'sine';
      oscHarmonic.frequency.setValueAtTime(freq * 2, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.24);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(getMasterNode(ctx));

      osc.start(startTime);
      oscHarmonic.start(startTime);
      osc.stop(startTime + 0.25);
      oscHarmonic.stop(startTime + 0.25);
    });
  } catch {
    // Silently handle
  }
}

export function playErrorBuzz(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(getMasterNode(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  } catch {
    // Silently handle
  }
}

// Deep atmospheric low-end thud with subtle dissonance for Sudden Death
export function playSuddenDeathImpact(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Sub-bass heavy impact
    const oscSub = ctx.createOscillator();
    const gainSub = ctx.createGain();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(145, now);
    oscSub.frequency.exponentialRampToValueAtTime(38, now + 0.38);

    gainSub.gain.setValueAtTime(0.24, now);
    gainSub.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    oscSub.connect(gainSub);
    gainSub.connect(getMasterNode(ctx));

    oscSub.start(now);
    oscSub.stop(now + 0.46);

    // Subtle mid-frequency dissonance
    const oscDiss = ctx.createOscillator();
    const gainDiss = ctx.createGain();
    oscDiss.type = 'sawtooth';
    oscDiss.frequency.setValueAtTime(74, now);
    oscDiss.frequency.linearRampToValueAtTime(55, now + 0.25);

    gainDiss.gain.setValueAtTime(0.12, now);
    gainDiss.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    oscDiss.connect(gainDiss);
    gainDiss.connect(getMasterNode(ctx));

    oscDiss.start(now);
    oscDiss.stop(now + 0.32);
  } catch {
    // Silently handle
  }
}

// Triumphant 6-note arpeggio flourish when achieving a new personal high score
export function playNewRecordCelebration(): void {
  if (isSoundMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // C5, E5, G5, B5, C6, E6
    const flourish = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];

    flourish.forEach((freq, idx) => {
      const startTime = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === flourish.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const isFinal = idx === flourish.length - 1;
      const duration = isFinal ? 0.45 : 0.22;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.17, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(getMasterNode(ctx));

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    });
  } catch {
    // Silently handle
  }
}

