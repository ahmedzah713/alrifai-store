import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  CalendarDays,
  CalendarCheck,
  Circle,
  Diamond,
  Gem,
  Hexagon,
  Languages,
  LogIn,
  Medal,
  LogOut,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Timer,
  Volume2,
  Zap,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import HighScores from '@/components/HighScores';
import { usePi } from '@/contexts/PiContext';
import { LEVELS, calculateMatchPoints, getLevelConfig, isObjectiveComplete } from '@shared/gameRules';
import { getAchievementIds, getDailyChallenge, getRemainingSeconds, isDailyChallengeExpired, type AchievementId } from '@shared/challengeRules';
import { copy, getInitialLanguage, setStoredLanguage, type Language } from '@/lib/i18n';
import {
  getSoundEnabled as getStoredSoundEnabled,
  playAchievement,
  playCombo,
  playExplosion,
  playGameOver,
  playInvalid,
  playLevelUp,
  playMatch,
  playObjective,
  playPause,
  playStart,
  playSwipe,
  playWin,
  setSoundEnabled as setStoredSoundEnabled,
} from '@/lib/sfx';

type TileType = 'purple' | 'gold' | 'blue' | 'pink' | 'green';
type Phase = 'playing' | 'paused' | 'over';
type GameMode = 'classic' | 'daily';
type StatusKey = 'playing' | 'invalid' | 'matched' | 'levelUp' | 'objective' | 'dailyComplete' | 'dailyExpired' | 'gameOver';
type Direction = 'left' | 'right' | 'up' | 'down';

interface Tile {
  id: string;
  type: TileType;
}

const GRID_SIZE = 8;
const TILE_TYPES: TileType[] = ['purple', 'gold', 'blue', 'pink', 'green'];

const TILE_META: Record<TileType, { label: string; Icon: typeof Gem; face: string; glow: string; edge: string }> = {
  purple: { label: 'Amethyst', Icon: Gem, face: '#9b5de5', glow: 'rgba(155,93,229,.55)', edge: '#c89aff' },
  gold: { label: 'Pi Gold', Icon: Star, face: '#f5bd4d', glow: 'rgba(245,189,77,.62)', edge: '#ffe7a6' },
  blue: { label: 'Sapphire', Icon: Diamond, face: '#4c86e8', glow: 'rgba(76,134,232,.52)', edge: '#a9c8ff' },
  pink: { label: 'Coral', Icon: Circle, face: '#ed6a9a', glow: 'rgba(237,106,154,.52)', edge: '#ffc0d5' },
  green: { label: 'Emerald', Icon: Hexagon, face: '#55c5a9', glow: 'rgba(85,197,169,.52)', edge: '#b5f5e4' },
};

const uid = () => Math.random().toString(36).slice(2, 9);
const cloneBoard = (board: Tile[][]): Tile[][] => board.map((row) => row.map((tile) => ({ ...tile })));

const wouldCreateStartingMatch = (board: Tile[][], row: number, col: number, type: TileType) => {
  const leftOne = col >= 1 ? board[row][col - 1]?.type : undefined;
  const leftTwo = col >= 2 ? board[row][col - 2]?.type : undefined;
  const upOne = row >= 1 ? board[row - 1]?.[col]?.type : undefined;
  const upTwo = row >= 2 ? board[row - 2]?.[col]?.type : undefined;
  return (leftOne === type && leftTwo === type) || (upOne === type && upTwo === type);
};

const randomType = (blocked: TileType[] = []): TileType => {
  const available = TILE_TYPES.filter((type) => !blocked.includes(type));
  return available[Math.floor(Math.random() * available.length)] ?? TILE_TYPES[0];
};

const createBoard = (): Tile[][] => {
  const next: Tile[][] = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    next[row] = [];
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const blocked = TILE_TYPES.filter((type) => wouldCreateStartingMatch(next, row, col, type));
      next[row][col] = { id: uid(), type: randomType(blocked) };
    }
  }
  return next;
};

const findMatches = (board: Tile[][]): Set<string> => {
  const matches = new Set<string>();
  for (let row = 0; row < GRID_SIZE; row += 1) {
    let start = 0;
    while (start < GRID_SIZE) {
      let end = start + 1;
      while (end < GRID_SIZE && board[row][end].type === board[row][start].type) end += 1;
      if (end - start >= 3) for (let col = start; col < end; col += 1) matches.add(`${row}-${col}`);
      start = end;
    }
  }
  for (let col = 0; col < GRID_SIZE; col += 1) {
    let start = 0;
    while (start < GRID_SIZE) {
      let end = start + 1;
      while (end < GRID_SIZE && board[end][col].type === board[start][col].type) end += 1;
      if (end - start >= 3) for (let row = start; row < end; row += 1) matches.add(`${row}-${col}`);
      start = end;
    }
  }
  return matches;
};

const swapTiles = (board: Tile[][], first: [number, number], second: [number, number]) => {
  const next = cloneBoard(board);
  const [firstRow, firstCol] = first;
  const [secondRow, secondCol] = second;
  const temp = next[firstRow][firstCol];
  next[firstRow][firstCol] = next[secondRow][secondCol];
  next[secondRow][secondCol] = temp;
  return next;
};

const collapseAndRefill = (board: Tile[][], matches: Set<string>) => {
  const next: Tile[][] = Array.from({ length: GRID_SIZE }, () => []);
  for (let col = 0; col < GRID_SIZE; col += 1) {
    const survivors: Tile[] = [];
    for (let row = GRID_SIZE - 1; row >= 0; row -= 1) {
      if (!matches.has(`${row}-${col}`)) survivors.push(board[row][col]);
    }
    while (survivors.length < GRID_SIZE) survivors.push({ id: uid(), type: randomType() });
    for (let row = 0; row < GRID_SIZE; row += 1) next[row][col] = survivors[GRID_SIZE - 1 - row];
  }
  return next;
};

const resolveBoard = (board: Tile[][]) => {
  let next = cloneBoard(board);
  let cascade = 0;
  let points = 0;
  let matchedTiles = 0;
  while (cascade < 12) {
    const matches = findMatches(next);
    if (matches.size === 0) break;
    matchedTiles += matches.size;
    points += calculateMatchPoints(matches.size, cascade);
    next = collapseAndRefill(next, matches);
    cascade += 1;
  }
  return { board: next, points, matchedTiles, cascade };
};

const findFirstValidSwap = (board: Tile[][]): [[number, number], [number, number]] | null => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const first: [number, number] = [row, col];
      const candidates: [number, number][] = [[row, col + 1], [row + 1, col]];
      for (const second of candidates) {
        if (second[0] >= GRID_SIZE || second[1] >= GRID_SIZE) continue;
        if (findMatches(swapTiles(board, first, second)).size > 0) return [first, second];
      }
    }
  }
  return null;
};

const getDirection = (first: [number, number], second: [number, number]): Direction => {
  if (second[1] > first[1]) return 'right';
  if (second[1] < first[1]) return 'left';
  if (second[0] > first[0]) return 'down';
  return 'up';
};

const DEMO_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo');

export default function Game() {
  const [, navigate] = useLocation();
  const { user, login, logout, saveScore, highScores, isLoading } = usePi();
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const [board, setBoard] = useState<Tile[][]>(() => createBoard());
  const [activeTile, setActiveTile] = useState<[number, number] | null>(null);
  const [mode, setMode] = useState<GameMode>(() => (typeof window !== 'undefined' && window.localStorage.getItem('pi-match3-mode') === 'daily' ? 'daily' : 'classic'));
  const dailyChallenge = useMemo(() => getDailyChallenge(), []);
  const [dailyStartedAt, setDailyStartedAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const storedKey = window.localStorage.getItem('pi-match3-daily-key');
    const storedStart = Number(window.localStorage.getItem('pi-match3-daily-started-at') ?? '0');
    return storedKey === getDailyChallenge().key && storedStart > 0 ? storedStart : null;
  });
  const [dailyComplete, setDailyComplete] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem(`pi-match3-daily-complete-${getDailyChallenge().key}`) === 'yes');
  const [now, setNow] = useState(() => Date.now());
  const [bursts, setBursts] = useState<Array<{ id: string; left: number; top: number; color: string }>>([]);
  const [achievementIds, setAchievementIds] = useState<AchievementId[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(window.localStorage.getItem('pi-match3-achievements') ?? '[]') as AchievementId[]; } catch { return []; }
  });
  const [achievementToast, setAchievementToast] = useState<AchievementId | null>(null);
  const [maxCombo, setMaxCombo] = useState(0);
  const [comboFlash, setComboFlash] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [score, setScore] = useState(0);
  const [levelScore, setLevelScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [bestScore, setBestScore] = useState(0);
  const [moves, setMoves] = useState(LEVELS[0].moves);
  const [phase, setPhase] = useState<Phase>('playing');
  const [statusKey, setStatusKey] = useState<StatusKey>('playing');
  const [lastGain, setLastGain] = useState(0);
  const [resolving, setResolving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => getStoredSoundEnabled());
  const pointerStartRef = useRef<{ row: number; col: number; x: number; y: number; pointerId: number } | null>(null);
  const demoMoveRef = useRef<[[number, number], [number, number]] | null>(null);
  const resolveTimerRef = useRef<number | null>(null);
  const t = copy[language];
  const isArabic = language === 'ar';
  const currentLevel = getLevelConfig(level);

  useEffect(() => {
    const storedBest = Number(window.localStorage.getItem('pi-match3-best') ?? '0');
    setBestScore(Math.max(storedBest, highScores[0]?.score ?? 0));
  }, [highScores]);

  useEffect(() => () => {
    if (resolveTimerRef.current) window.clearTimeout(resolveTimerRef.current);
  }, []);

  const topScore = useMemo(() => Math.max(bestScore, score), [bestScore, score]);
  const targetScore = mode === 'daily' ? dailyChallenge.target : currentLevel.target;
  const levelProgress = Math.max(0, Math.min(100, ((mode === 'daily' ? score : levelScore) / targetScore) * 100));
  const dailySecondsLeft = getRemainingSeconds(dailyStartedAt, now, dailyChallenge.durationSeconds);
  const formattedDailyTime = `${String(Math.floor(dailySecondsLeft / 60)).padStart(2, '0')}:${String(dailySecondsLeft % 60).padStart(2, '0')}`;
  const unlockedAchievements = new Set(achievementIds);

  useEffect(() => {
    if (mode !== 'daily' || !dailyStartedAt || phase !== 'playing') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [dailyStartedAt, mode, phase]);

  useEffect(() => {
    if (mode !== 'daily' || !dailyStartedAt || dailyComplete) return;
    if (isDailyChallengeExpired(dailyStartedAt, now, dailyChallenge.durationSeconds)) {
      setStatusKey('dailyExpired');
      setPhase('over');
    }
  }, [dailyChallenge.durationSeconds, dailyComplete, dailyStartedAt, mode, now]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const awardAchievement = (achievement: AchievementId) => {
    setAchievementIds((current) => {
      if (current.includes(achievement)) return current;
      const next = [...current, achievement];
      window.localStorage.setItem('pi-match3-achievements', JSON.stringify(next));
      setAchievementToast(achievement);
      if (soundEnabled) playAchievement();
      window.setTimeout(() => setAchievementToast(null), 2400);
      return next;
    });
  };

  const syncAchievements = (reachedLevel: number, combo: number, completedDaily: boolean) => {
    getAchievementIds(reachedLevel, combo, completedDaily).forEach(awardAchievement);
  };

  const startNewGame = (nextMode: GameMode = mode) => {
    if (resolveTimerRef.current) window.clearTimeout(resolveTimerRef.current);
    setMode(nextMode);
    window.localStorage.setItem('pi-match3-mode', nextMode);
    let nextDailyStartedAt: number | null = null;
    if (nextMode === 'daily') {
      nextDailyStartedAt = Date.now();
      setDailyStartedAt(nextDailyStartedAt);
      window.localStorage.setItem('pi-match3-daily-key', dailyChallenge.key);
      window.localStorage.setItem('pi-match3-daily-started-at', String(nextDailyStartedAt));
      setDailyComplete(false);
    } else {
      setDailyStartedAt(null);
    }
    setBoard(createBoard());
    setActiveTile(null);
    setScore(0);
    setLevelScore(0);
    setLevel(1);
    setMoves(LEVELS[0].moves);
    setLastGain(0);
    setStatusKey('playing');
    setPhase('playing');
    setResolving(false);
    setBursts([]);
    if (soundEnabled) playStart();
  };

  const finishGame = (finalScore: number, reachedLevel: number, won: boolean, comboOverride = maxCombo) => {
    const nextBest = Math.max(bestScore, finalScore);
    const earnedAchievements = Array.from(new Set([...achievementIds, ...getAchievementIds(reachedLevel, comboOverride, mode === 'daily' && won)]));
    setBestScore(nextBest);
    window.localStorage.setItem('pi-match3-best', String(nextBest));
    setPhase('over');
    setActiveTile(null);
    if (soundEnabled) won ? playWin() : playGameOver();
    void saveScore(finalScore);
  };

  const attemptMove = (row: number, col: number, direction: Direction) => {
    if (resolving || phase !== 'playing') return;
    if (mode === 'daily' && (!dailyStartedAt || dailySecondsLeft <= 0 || dailyComplete)) {
      setStatusKey(dailySecondsLeft <= 0 ? 'dailyExpired' : 'dailyComplete');
      return;
    }
    const targetRow = row + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0);
    const targetCol = col + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0);
    if (targetRow < 0 || targetRow >= GRID_SIZE || targetCol < 0 || targetCol >= GRID_SIZE) {
      setStatusKey('invalid');
      if (soundEnabled) playInvalid();
      return;
    }

    if (soundEnabled) playSwipe(direction);
    const swapped = swapTiles(board, [row, col], [targetRow, targetCol]);
    const immediateMatches = findMatches(swapped);
    setActiveTile(null);

    if (immediateMatches.size === 0) {
      setStatusKey('invalid');
      if (soundEnabled) playInvalid();
      return;
    }

    const result = resolveBoard(swapped);
    const nextScore = score + result.points;
    const nextLevelScore = levelScore + result.points;
    const nextMoves = moves - 1;
    const nextCombo = Math.max(maxCombo, result.cascade);
    setResolving(true);
    setMaxCombo(nextCombo);
    if (result.cascade > 1) {
      setComboFlash(result.cascade);
      window.setTimeout(() => setComboFlash(0), 760);
    }
    syncAchievements(level, nextCombo, mode === 'daily' && nextScore >= targetScore);
    if (!reducedMotion) {
      const colors = Object.values(TILE_META).map((meta) => meta.glow);
      setBursts(Array.from({ length: Math.min(12, Math.max(4, Math.floor(result.matchedTiles / 2))) }, (_, index) => ({ id: `${Date.now()}-${index}`, left: 12 + Math.random() * 76, top: 12 + Math.random() * 76, color: colors[index % colors.length] })));
      window.setTimeout(() => setBursts([]), 620);
    }
    if (soundEnabled) playExplosion(result.matchedTiles, result.cascade);
    if (soundEnabled && result.cascade > 1) playCombo(result.cascade);

    resolveTimerRef.current = window.setTimeout(() => {
      const objectiveComplete = mode === 'daily' ? nextScore >= targetScore : isObjectiveComplete(nextLevelScore, level);
      const isFinalLevel = level >= LEVELS.length;
      setScore(nextScore);
      setLastGain(result.points);
      setMoves(nextMoves);
      if (soundEnabled) playMatch(result.cascade, result.matchedTiles);

      if (mode === 'daily') {
        setBoard(result.board);
        setLevelScore(nextLevelScore);
        setStatusKey(objectiveComplete ? 'dailyComplete' : 'matched');
        setResolving(false);
        if (objectiveComplete) {
          setDailyComplete(true);
          window.localStorage.setItem(`pi-match3-daily-complete-${dailyChallenge.key}`, 'yes');
          syncAchievements(level, nextCombo, true);
          finishGame(nextScore, level, true, nextCombo);
        } else if (dailySecondsLeft <= 0) {
          setStatusKey('dailyExpired');
          finishGame(nextScore, level, false, nextCombo);
        }
        return;
      }

      if (objectiveComplete && !isFinalLevel) {
        const nextLevel = level + 1;
        setBoard(createBoard());
        setLevel(nextLevel);
        setLevelScore(0);
        setMoves(LEVELS[nextLevel - 1].moves);
        setStatusKey('levelUp');
        syncAchievements(nextLevel, nextCombo, false);
        setResolving(false);
        if (soundEnabled) {
          playObjective();
          playLevelUp();
        }
        return;
      }

      setBoard(result.board);
      setLevelScore(nextLevelScore);
      setStatusKey(objectiveComplete ? 'objective' : 'matched');
      setResolving(false);

      if (objectiveComplete && isFinalLevel) {
        finishGame(nextScore, level, true, nextCombo);
      } else if (nextMoves <= 0) {
        setStatusKey('gameOver');
        finishGame(nextScore, level, false);
      }
    }, 170);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, row: number, col: number) => {
    if (resolving || phase !== 'playing') return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointerStartRef.current = { row, col, x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    setActiveTile([row, col]);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    if (distance < 18) {
      setActiveTile(null);
      setStatusKey('invalid');
      if (soundEnabled) playInvalid();
      return;
    }
    const direction: Direction = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    attemptMove(start.row, start.col, direction);
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
    setActiveTile(null);
  };

  const handleTileKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, row: number, col: number) => {
    const directionByKey: Partial<Record<string, Direction>> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
    };
    const direction = directionByKey[event.key];
    if (!direction) return;
    event.preventDefault();
    attemptMove(row, col, direction);
  };

  const toggleLanguage = () => {
    const next = isArabic ? 'en' : 'ar';
    setLanguage(next);
    setStoredLanguage(next);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setStoredSoundEnabled(next);
    if (next) playStart();
  };

  useEffect(() => {
    if (!DEMO_MODE || phase !== 'playing' || resolving || moves <= 0) return;
    const move = findFirstValidSwap(board);
    if (!move) return;
    demoMoveRef.current = move;
    const timer = window.setTimeout(() => attemptMove(move[0][0], move[0][1], getDirection(move[0], move[1])), 360);
    return () => window.clearTimeout(timer);
  }, [board, moves, phase, resolving]);

  const statusText = {
    playing: t.playing,
    invalid: t.invalid,
    matched: t.matched,
    levelUp: t.levelUp,
    objective: t.objectiveComplete,
    dailyComplete: t.dailyComplete,
    dailyExpired: t.dailyExpired,
    gameOver: t.gameOver,
  }[statusKey];

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="relative flex h-[100dvh] min-h-[100svh] flex-col overflow-hidden bg-[#12091f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(126,62,196,0.28),transparent_30%),radial-gradient(circle_at_94%_20%,rgba(245,189,77,0.10),transparent_24%)]" />
      <header className="relative z-20 flex h-[clamp(48px,7dvh,66px)] shrink-0 items-center justify-between border-b border-white/10 bg-[#12091f]/70 px-3 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={() => navigate('/')} aria-label={t.home} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#eadcf2] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]"><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></button>
          <div className="min-w-0"><p className="truncate text-sm font-black text-[#fff9ff] sm:text-base">{t.brand}</p><p className="hidden truncate text-[10px] font-semibold text-[#a997b9] sm:block">{user ? `${t.loggedAs} ${user.username}` : t.guest}</p></div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={toggleLanguage} aria-label={t.language} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 text-[10px] font-black text-[#f5bd4d] transition hover:border-[#f5bd4d]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]"><Languages className="h-3.5 w-3.5" /> {t.languageShort}</button>
          <button type="button" onClick={toggleSound} aria-label={soundEnabled ? t.soundOn : t.soundOff} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#f5bd4d] transition hover:border-[#f5bd4d]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]">{soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
          <button type="button" title={t.achievements} className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#f5bd4d]"><Medal className="h-4 w-4" />{achievementIds.length > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#73d5c0] px-1 text-[9px] font-black text-[#162532]">{achievementIds.length}</span>}</button>
          {!user ? <Button type="button" onClick={() => void login()} disabled={isLoading} className="h-9 rounded-full bg-[#f5bd4d] px-2.5 text-[10px] font-black text-[#28113f] hover:bg-[#ffd36e] sm:px-3"><LogIn className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">{t.signIn}</span></Button> : <button type="button" onClick={logout} aria-label={t.signOut} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#eadcf2] transition hover:border-red-300/50 hover:text-red-200 sm:h-9 sm:w-auto sm:gap-1.5 sm:px-3"><LogOut className="h-4 w-4" /><span className="hidden text-xs font-bold sm:inline">{t.signOut}</span></button>}
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-2 pb-2 pt-1 sm:px-6 sm:pb-4 sm:pt-2">
        <div className="mx-auto flex w-full max-w-[760px] shrink-0 items-center justify-between gap-2"><div className="min-w-0"><div className="flex items-center gap-1.5"><span className="inline-flex items-center gap-1 rounded-full border border-[#f5bd4d]/25 bg-[#f5bd4d]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#f7d98f]"><Sparkles className="h-3 w-3" /> Pi puzzle</span><span className="truncate text-[10px] font-semibold text-[#a997b9] sm:text-xs">{mode === 'daily' ? t.dailyChallenge : t.eyebrow}</span></div><h1 className="mt-1 truncate text-xl font-black tracking-[-0.05em] text-[#fff9ff] sm:text-3xl">{mode === 'daily' ? t.dailyChallenge : t.brand}</h1></div><div className="text-right rtl:text-left"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#a997b9]">{statusText}</p><p className="mt-0.5 text-xs font-bold text-[#f5bd4d]">{lastGain > 0 ? `+${lastGain} ${t.score}` : t.swipeHint}</p></div></div>

        <div className="mx-auto mt-2 grid w-full max-w-[760px] shrink-0 grid-cols-4 gap-1.5 sm:gap-2">{[{ label: t.level, value: mode === 'daily' ? '—' : level, accent: '#73d5c0' }, { label: t.score, value: score, accent: '#f5bd4d' }, { label: t.best, value: topScore, accent: '#d1a8ff' }, { label: t.moves, value: moves, accent: '#73d5c0' }].map((item) => <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.045] px-1 py-1.5 text-center sm:rounded-2xl sm:px-2 sm:py-2.5"><p className="truncate text-[8px] font-black uppercase tracking-[0.1em] text-[#a997b9] sm:text-[10px]">{item.label}</p><p className="mt-0.5 text-base font-black sm:text-2xl" style={{ color: item.accent }}>{item.value}</p></div>)}</div>

        <div className="mx-auto mt-2 flex w-full max-w-[760px] shrink-0 items-center gap-1.5"><button type="button" onClick={() => startNewGame('classic')} className={`flex min-h-8 flex-1 items-center justify-center gap-1 rounded-xl border px-2 text-[10px] font-black transition ${mode === 'classic' ? 'border-[#f5bd4d]/60 bg-[#f5bd4d]/15 text-[#f5bd4d]' : 'border-white/10 bg-white/[0.04] text-[#a997b9]'}`}><RotateCcw className="h-3 w-3" /> {t.newGame}</button><button type="button" onClick={() => mode === 'daily' && dailyStartedAt ? undefined : startNewGame('daily')} className={`flex min-h-8 flex-[1.3] items-center justify-center gap-1 rounded-xl border px-2 text-[10px] font-black transition ${mode === 'daily' ? 'border-[#73d5c0]/60 bg-[#73d5c0]/15 text-[#9af0d8]' : 'border-white/10 bg-white/[0.04] text-[#a997b9]'}`}><CalendarDays className="h-3 w-3" /> {mode === 'daily' ? (dailyStartedAt ? `${t.timeLeft} ${formattedDailyTime}` : t.dailyStart) : t.dailyChallengeShort}</button></div>
        <div className="mx-auto mt-1.5 w-full max-w-[760px] shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5"><div className="flex items-center justify-between gap-2 text-[9px] font-black text-[#c9b6d8]"><span>{mode === 'daily' ? t.dailyTarget : t.objective}: {targetScore}</span><span>{Math.round(levelProgress)}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#8e5dd3] via-[#f5bd4d] to-[#73d5c0] transition-[width] duration-300" style={{ width: `${levelProgress}%` }} /></div></div>

        <div className="mx-auto mt-2 flex min-h-0 flex-1 items-center justify-center py-1"><section className="relative w-[min(88vw,46dvh)] lg:w-[min(46vw,42dvh)]"><div className="relative aspect-square rounded-[1.35rem] border border-[#f5bd4d]/25 bg-[#1d0c31]/90 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.35)] sm:rounded-[1.75rem] sm:p-2">{comboFlash > 1 && !reducedMotion && <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 -translate-y-1/2 text-center pi-combo-flash"><span className="inline-flex items-center gap-1 rounded-full border border-[#f5bd4d]/70 bg-[#29103f]/90 px-4 py-2 text-sm font-black text-[#fff4c8] shadow-[0_0_24px_rgba(245,189,77,.55)]"><Zap className="h-4 w-4 text-[#f5bd4d]" /> COMBO ×{comboFlash}</span></div>}<div className="grid h-full w-full grid-cols-8 gap-1 rounded-[0.95rem] border border-white/10 bg-[#12091f] p-1 shadow-inner sm:gap-1.5 sm:rounded-[1.25rem] sm:p-1.5">{board.flatMap((row, rowIndex) => row.map((tile, colIndex) => { const meta = TILE_META[tile.type]; const TileIcon = meta.Icon; const isActive = activeTile?.[0] === rowIndex && activeTile?.[1] === colIndex; return <button key={tile.id} type="button" aria-label={`${meta.label}, ${rowIndex + 1}, ${colIndex + 1}`} onPointerDown={(event) => handlePointerDown(event, rowIndex, colIndex)} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onKeyDown={(event) => handleTileKeyDown(event, rowIndex, colIndex)} disabled={resolving || phase !== 'playing'} className={`pi-match3-tile group relative min-w-0 touch-none select-none overflow-hidden rounded-[0.42rem] border text-white transition duration-150 ease-out sm:rounded-lg ${isActive ? 'z-10 scale-[1.08] border-[#fff4c8] ring-2 ring-[#f5bd4d] ring-offset-1 ring-offset-[#12091f]' : 'border-white/20'} ${resolving ? 'animate-[tilePulse_220ms_ease-out]' : ''} ${phase === 'playing' ? 'active:scale-95' : 'opacity-90'}`} style={{ background: `linear-gradient(145deg, ${meta.edge} 0%, ${meta.face} 22%, ${meta.face} 70%, #32164f 100%)`, boxShadow: isActive ? `0 0 22px ${meta.glow}` : `inset 0 1px 0 rgba(255,255,255,.35), 0 3px 8px rgba(0,0,0,.22)` }}><span className="absolute inset-x-1 top-1 h-1/4 rounded-full bg-white/25 blur-[2px]" /><TileIcon className="relative mx-auto h-[48%] w-[48%] drop-shadow-[0_2px_3px_rgba(30,5,48,.45)]" strokeWidth={2.5} /><span className="sr-only">{meta.label}</span></button>; }))}</div>{bursts.map((burst) => <span key={burst.id} className="pi-explosion-particle pointer-events-none absolute h-2 w-2 rounded-full" style={{ left: `${burst.left}%`, top: `${burst.top}%`, background: burst.color, boxShadow: `0 0 12px ${burst.color}` }} />)}</div>{phase === 'paused' && <div className="absolute inset-0 grid place-items-center rounded-[1.35rem] bg-[#12091f]/80 p-4 backdrop-blur-[2px]"><div className="text-center"><Pause className="mx-auto h-8 w-8 text-[#f5bd4d]" /><p className="mt-2 text-base font-black">{t.paused}</p><button type="button" onClick={() => setPhase('playing')} className="mt-3 text-xs font-bold text-[#f5bd4d] underline underline-offset-4">{t.resume}</button></div></div>}{phase === 'over' && <div className="absolute inset-0 grid place-items-center rounded-[1.35rem] bg-[#12091f]/82 p-3 backdrop-blur-[2px]"><div className="w-[86%] rounded-2xl border border-[#f5bd4d]/30 bg-[#29103f]/95 p-4 text-center shadow-2xl"><Trophy className="mx-auto h-8 w-8 text-[#f5bd4d]" /><p className="mt-2 text-base font-black">{statusKey === 'dailyComplete' ? t.dailyComplete : statusKey === 'dailyExpired' ? t.dailyExpired : t.gameOver}</p><p className="mt-2 text-[11px] text-[#c9b6d8]">{mode === 'daily' ? t.challengeScore : t.finalScore}</p><p className="text-3xl font-black text-[#f5bd4d]">{score}</p><Button type="button" onClick={() => startNewGame(mode)} className="mt-3 min-h-9 w-full rounded-xl bg-[#f5bd4d] text-xs font-black text-[#28113f] hover:bg-[#ffd36e]">{t.playAgain}</Button></div></div>}</section></div>

        <div className="mx-auto flex w-full max-w-[760px] shrink-0 items-center justify-center gap-1.5 sm:gap-2"><button type="button" onClick={() => { if (soundEnabled) playPause(); setPhase(phase === 'paused' ? 'playing' : 'paused'); setActiveTile(null); }} className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-white/15 px-2.5 text-[10px] font-bold text-[#eadcf2] transition hover:border-[#f5bd4d]/50"><Pause className="h-3 w-3" /> <span className="hidden sm:inline">{phase === 'paused' ? t.resume : t.pause}</span></button><div className="inline-flex items-center gap-1 rounded-xl border border-[#f5bd4d]/20 bg-[#f5bd4d]/[0.08] px-2.5 py-1.5 text-[10px] font-black text-[#f7d98f]"><Zap className="h-3 w-3" /> {reducedMotion ? t.effectsReduced : t.effectsOn}</div><div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-bold text-[#a997b9]"><Medal className="h-3 w-3 text-[#f5bd4d]" /> {achievementIds.length}/3</div></div>
        <div className="mx-auto mt-1.5 flex w-full max-w-[760px] shrink-0 items-center justify-center gap-1.5">{([{ id: 'level' as AchievementId, Icon: Medal, label: t.achievementLevel }, { id: 'combo' as AchievementId, Icon: Zap, label: t.achievementCombo }, { id: 'daily' as AchievementId, Icon: CalendarCheck, label: t.achievementDaily }] as const).map((badge) => { const unlocked = unlockedAchievements.has(badge.id); const Icon = unlocked ? badge.Icon : LockKeyhole; return <div key={badge.id} title={unlocked ? badge.label : t.achievementLocked} className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-[8px] font-black transition ${unlocked ? 'border-[#f5bd4d]/45 bg-[#f5bd4d]/10 text-[#f7d98f]' : 'border-white/10 bg-white/[0.03] text-[#746781]'}`}><Icon className="h-3 w-3 shrink-0" /><span className="truncate">{badge.label}</span></div>; })}</div>

        {achievementToast && <div className="pointer-events-none fixed inset-x-0 top-[clamp(54px,8dvh,76px)] z-40 mx-auto flex w-max max-w-[92vw] items-center gap-2 rounded-full border border-[#f5bd4d]/50 bg-[#29103f]/95 px-4 py-2 text-xs font-black text-[#fff4c8] shadow-2xl pi-achievement-pop"><Medal className="h-4 w-4 text-[#f5bd4d]" /> {t.achievementUnlocked}: {achievementToast === 'level' ? t.achievementLevel : achievementToast === 'combo' ? t.achievementCombo : t.achievementDaily}</div>}

        <aside className="mt-3 hidden shrink-0 gap-3 lg:grid lg:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3"><div className="flex items-center gap-2 text-xs font-black text-[#f5bd4d]"><CalendarCheck className="h-4 w-4" /> {t.dailyChallenge}</div><p className="mt-1 text-[11px] text-[#c9b6d8]">{t.dailyDescription}</p></div><HighScores language={language} /></aside>
      </section>
    </main>
  );
}
