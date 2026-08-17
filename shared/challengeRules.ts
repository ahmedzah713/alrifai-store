export type AchievementId = 'level' | 'combo' | 'daily';

export interface DailyChallenge {
  key: string;
  target: number;
  durationSeconds: number;
}

export const DAILY_DURATION_SECONDS = 180;

export const getUtcDayKey = (date: Date = new Date()) => date.toISOString().slice(0, 10);

const stableDayNumber = (dayKey: string) => dayKey.split('').reduce((total, character) => (total * 31 + character.charCodeAt(0)) % 997, 0);

export const getDailyChallenge = (date: Date = new Date()): DailyChallenge => {
  const key = getUtcDayKey(date);
  const dayNumber = stableDayNumber(key);
  return {
    key,
    target: 360 + (dayNumber % 5) * 80,
    durationSeconds: DAILY_DURATION_SECONDS,
  };
};

export const getRemainingSeconds = (startedAt: number | null, now: number, durationSeconds = DAILY_DURATION_SECONDS) => {
  if (!startedAt) return durationSeconds;
  return Math.min(durationSeconds, Math.max(0, Math.ceil((startedAt + durationSeconds * 1000 - now) / 1000)));
};

export const isDailyChallengeExpired = (startedAt: number | null, now: number, durationSeconds = DAILY_DURATION_SECONDS) => Boolean(startedAt && getRemainingSeconds(startedAt, now, durationSeconds) <= 0);

export const getAchievementIds = (level: number, maxCombo: number, dailyComplete: boolean): AchievementId[] => {
  const achievements: AchievementId[] = [];
  if (level >= 2) achievements.push('level');
  if (maxCombo >= 3) achievements.push('combo');
  if (dailyComplete) achievements.push('daily');
  return achievements;
};
