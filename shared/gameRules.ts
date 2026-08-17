export interface LevelConfig {
  level: number;
  target: number;
  moves: number;
}

export const LEVELS: readonly LevelConfig[] = [
  { level: 1, target: 220, moves: 20 },
  { level: 2, target: 460, moves: 20 },
  { level: 3, target: 760, moves: 19 },
  { level: 4, target: 1_120, moves: 18 },
  { level: 5, target: 1_560, moves: 18 },
  { level: 6, target: 2_100, moves: 17 },
];

export const getLevelConfig = (level: number): LevelConfig => LEVELS[Math.max(1, Math.min(LEVELS.length, Math.floor(level))) - 1] ?? LEVELS[0];

export const isObjectiveComplete = (levelScore: number, level: number) => levelScore >= getLevelConfig(level).target;

export const calculateMatchPoints = (matchedTiles: number, cascade: number) => Math.max(0, matchedTiles) * 10 + Math.max(0, cascade) * 25;
