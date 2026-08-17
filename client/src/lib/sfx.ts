/* Style reminder: sound is a restrained tactile layer—short jewel-like tones, no distracting loops, and a user-controlled mute state. */

const STORAGE_KEY = 'pi-match3-sound-enabled';
let audioContext: AudioContext | null = null;

const getContext = () => {
  if (typeof window === 'undefined') return null;
  if (audioContext) return audioContext;
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = new AudioContextCtor();
  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0) => {
  const context = getContext();
  if (!context) return;
  if (context.state === 'suspended') void context.resume();

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startAt = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};

export const getSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'off';
};

export const setSoundEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
};

export const playSelect = () => playTone(520, 0.07, 'sine', 0.035);
export const playSwap = () => {
  playTone(420, 0.1, 'triangle', 0.04);
  playTone(660, 0.13, 'triangle', 0.035, 0.075);
};
export const playInvalid = () => {
  playTone(180, 0.1, 'square', 0.025);
  playTone(130, 0.13, 'square', 0.02, 0.08);
};
export const playMatch = (cascade = 0) => {
  const base = 560 + Math.min(cascade, 4) * 35;
  playTone(base, 0.14, 'sine', 0.05);
  playTone(base * 1.25, 0.18, 'sine', 0.04, 0.09);
  playTone(base * 1.5, 0.22, 'sine', 0.032, 0.18);
};
export const playStart = () => {
  playTone(390, 0.12, 'triangle', 0.04);
  playTone(520, 0.15, 'triangle', 0.04, 0.09);
  playTone(780, 0.2, 'triangle', 0.035, 0.2);
};
export const playPause = () => playTone(280, 0.12, 'sine', 0.035);
export const playWin = () => {
  playTone(520, 0.14, 'triangle', 0.045);
  playTone(660, 0.14, 'triangle', 0.045, 0.11);
  playTone(880, 0.24, 'triangle', 0.04, 0.22);
};
