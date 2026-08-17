/* Style reminder: sound is a tactile layer—short, bright, layered cues with a user-controlled mute state and no background loop. */

const STORAGE_KEY = 'pi-match3-sound-enabled';
let audioContext: AudioContext | null = null;

type ToneOptions = {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
  endFrequency?: number;
};

const getContext = () => {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = new AudioContextCtor();
  return audioContext;
};

const playTone = ({ frequency, duration, type = 'sine', volume = 0.04, delay = 0, endFrequency }: ToneOptions) => {
  const context = getContext();
  if (!context) return;
  if (context.state === 'suspended') void context.resume();

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;
  const stopAt = startAt + duration;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(20, frequency), startAt);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), stopAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(stopAt + 0.025);
};

const playChord = (frequencies: number[], duration: number, type: OscillatorType, volume: number, spacing = 0.035, endFrequency?: number) => {
  frequencies.forEach((frequency, index) => playTone({ frequency, duration, type, volume, delay: index * spacing, endFrequency }));
};

export const getSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'off';
};

export const setSoundEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
};

export const playSelect = () => playTone({ frequency: 520, duration: 0.07, type: 'sine', volume: 0.045 });

export const playSwipe = (direction: 'left' | 'right' | 'up' | 'down') => {
  const isVertical = direction === 'up' || direction === 'down';
  const start = direction === 'left' || direction === 'up' ? 620 : 440;
  playTone({ frequency: start, endFrequency: isVertical ? start * 1.12 : start * 1.22, duration: 0.12, type: 'triangle', volume: 0.055 });
  playTone({ frequency: start * 1.5, duration: 0.08, type: 'sine', volume: 0.025, delay: 0.045 });
};

export const playSwap = () => {
  playTone({ frequency: 420, duration: 0.1, type: 'triangle', volume: 0.05, endFrequency: 590 });
  playTone({ frequency: 660, duration: 0.13, type: 'triangle', volume: 0.04, delay: 0.075 });
};

export const playInvalid = () => {
  playTone({ frequency: 205, duration: 0.11, type: 'square', volume: 0.03, endFrequency: 150 });
  playTone({ frequency: 130, duration: 0.14, type: 'square', volume: 0.025, delay: 0.08 });
};

export const playMatch = (cascade = 0, matchedTiles = 3) => {
  const base = 560 + Math.min(cascade, 5) * 42;
  const sparkle = Math.min(6, Math.max(0, matchedTiles - 3));
  playChord([base, base * 1.25, base * 1.5], 0.2, 'sine', 0.045, 0.075);
  if (sparkle > 0) playChord(Array.from({ length: sparkle }, (_, index) => base * (1.75 + index * 0.12)), 0.16, 'triangle', 0.022, 0.045);
};

export const playCombo = (cascade: number) => {
  const base = 680 + Math.min(cascade, 6) * 55;
  playChord([base, base * 1.2, base * 1.5, base * 1.8], 0.24, 'triangle', 0.04, 0.06);
};

export const playStart = () => {
  playChord([390, 520, 650], 0.15, 'triangle', 0.045, 0.08);
  playTone({ frequency: 780, duration: 0.24, type: 'sine', volume: 0.04, delay: 0.25 });
};

export const playPause = () => {
  playTone({ frequency: 280, duration: 0.12, type: 'sine', volume: 0.04, endFrequency: 220 });
  playTone({ frequency: 180, duration: 0.16, type: 'sine', volume: 0.025, delay: 0.08 });
};

export const playObjective = () => {
  playChord([520, 660, 880], 0.2, 'sine', 0.045, 0.08);
  playTone({ frequency: 1040, duration: 0.25, type: 'triangle', volume: 0.035, delay: 0.22 });
};

export const playLevelUp = () => {
  playChord([440, 554, 659], 0.18, 'triangle', 0.05, 0.06);
  playChord([659, 831, 988], 0.25, 'sine', 0.045, 0.06, 0.31);
};

export const playGameOver = () => {
  playTone({ frequency: 360, duration: 0.16, type: 'triangle', volume: 0.035, endFrequency: 300 });
  playTone({ frequency: 240, duration: 0.22, type: 'sine', volume: 0.03, delay: 0.14, endFrequency: 180 });
};

export const playWin = () => {
  playChord([520, 660, 780], 0.17, 'triangle', 0.05, 0.08);
  playChord([660, 830, 1040], 0.21, 'triangle', 0.045, 0.07, 0.26);
  playTone({ frequency: 1320, duration: 0.3, type: 'sine', volume: 0.04, delay: 0.32 });
};

export const playExplosion = (matchedTiles = 3, cascade = 1) => {
  const size = Math.min(8, Math.max(3, matchedTiles));
  const base = 260 + Math.min(5, cascade) * 38;
  playTone({ frequency: base, endFrequency: 90, duration: 0.18, type: 'sawtooth', volume: 0.04 });
  playChord(Array.from({ length: size }, (_, index) => base * (1.55 + index * 0.09)), 0.12, 'triangle', 0.026, 0.025);
};

export const playAchievement = () => {
  playChord([660, 784, 988], 0.16, 'triangle', 0.045, 0.06);
  playTone({ frequency: 1175, duration: 0.28, type: 'sine', volume: 0.038, delay: 0.2 });
};

export const playDailyTick = (urgent = false) => {
  playTone({ frequency: urgent ? 880 : 620, duration: 0.06, type: 'square', volume: urgent ? 0.028 : 0.018 });
};
