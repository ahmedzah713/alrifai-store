/* Style reminder: the board is the hero—tactile jewel tiles, Pi plum surfaces, gold actions, and mobile-first controls with no hidden primary interaction. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft,
  Circle,
  Diamond,
  Gem,
  Hexagon,
  Languages,
  LogIn,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import HighScores from '@/components/HighScores';
import { usePi } from '@/contexts/PiContext';
import { copy, getInitialLanguage, setStoredLanguage, type Language } from '@/lib/i18n';

type TileType = 'purple' | 'gold' | 'blue' | 'pink' | 'green';
type Phase = 'ready' | 'playing' | 'paused' | 'over';
type StatusKey = 'ready' | 'playing' | 'invalid' | 'matched';

interface Tile {
  id: string;
  type: TileType;
}

const GRID_SIZE = 8;
const MAX_MOVES = 20;
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
      if (board[row][start].type && end - start >= 3) {
        for (let col = start; col < end; col += 1) matches.add(`${row}-${col}`);
      }
      start = end;
    }
  }
  for (let col = 0; col < GRID_SIZE; col += 1) {
    let start = 0;
    while (start < GRID_SIZE) {
      let end = start + 1;
      while (end < GRID_SIZE && board[end][col].type === board[start][col].type) end += 1;
      if (board[start][col].type && end - start >= 3) {
        for (let row = start; row < end; row += 1) matches.add(`${row}-${col}`);
      }
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
    for (let row = 0; row < GRID_SIZE; row += 1) {
      next[row][col] = survivors[GRID_SIZE - 1 - row];
    }
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
    points += matches.size * 10 + cascade * 25;
    next = collapseAndRefill(next, matches);
    cascade += 1;
  }
  return { board: next, points, matchedTiles, cascade };
};

const isAdjacent = (first: [number, number], second: [number, number]) =>
  (Math.abs(first[0] - second[0]) === 1 && first[1] === second[1]) ||
  (Math.abs(first[1] - second[1]) === 1 && first[0] === second[0]);

const findFirstValidSwap = (board: Tile[][]): [[number, number], [number, number]] | null => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const first: [number, number] = [row, col];
      const candidates: [number, number][] = [[row, col + 1], [row + 1, col]];
      for (const second of candidates) {
        if (second[0] >= GRID_SIZE || second[1] >= GRID_SIZE) continue;
        const swapped = swapTiles(board, first, second);
        if (findMatches(swapped).size > 0) return [first, second];
      }
    }
  }
  return null;
};

const DEMO_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo');

export default function Game() {
  const [, navigate] = useLocation();
  const { user, login, logout, saveScore, highScores, isLoading } = usePi();
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const [board, setBoard] = useState<Tile[][]>(() => createBoard());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [moves, setMoves] = useState(MAX_MOVES);
  const [phase, setPhase] = useState<Phase>('ready');
  const [statusKey, setStatusKey] = useState<StatusKey>('ready');
  const [lastGain, setLastGain] = useState(0);
  const [resolving, setResolving] = useState(false);
  const demoMoveRef = useRef<[[number, number], [number, number]] | null>(null);
  const t = copy[language];
  const isArabic = language === 'ar';

  useEffect(() => {
    const storedBest = Number(window.localStorage.getItem('pi-match3-best') ?? '0');
    setBestScore(Math.max(storedBest, highScores[0]?.score ?? 0));
  }, [highScores]);

  const topScore = useMemo(() => Math.max(bestScore, score), [bestScore, score]);

  const startNewGame = () => {
    setBoard(createBoard());
    setSelected(null);
    setScore(0);
    setMoves(MAX_MOVES);
    setLastGain(0);
    setStatusKey('playing');
    setPhase('playing');
    setResolving(false);
  };

  const finishGame = (finalScore: number) => {
    const nextBest = Math.max(bestScore, finalScore);
    setBestScore(nextBest);
    window.localStorage.setItem('pi-match3-best', String(nextBest));
    setPhase('over');
    setSelected(null);
    void saveScore(finalScore);
  };

  const handleTileClick = (row: number, col: number) => {
    if (phase !== 'playing' || resolving) return;
    const current: [number, number] = [row, col];
    if (!selected) {
      setSelected(current);
      setStatusKey('playing');
      return;
    }
    if (selected[0] === row && selected[1] === col) {
      setSelected(null);
      return;
    }
    if (!isAdjacent(selected, current)) {
      setSelected(current);
      return;
    }

    const swapped = swapTiles(board, selected, current);
    const immediateMatches = findMatches(swapped);
    setSelected(null);

    if (immediateMatches.size === 0) {
      setStatusKey('invalid');
      return;
    }

    const result = resolveBoard(swapped);
    const nextScore = score + result.points;
    const nextMoves = moves - 1;
    setResolving(true);
    setTimeout(() => {
      setBoard(result.board);
      setScore(nextScore);
      setMoves(nextMoves);
      setLastGain(result.points);
      setStatusKey('matched');
      setResolving(false);
      if (nextMoves <= 0) finishGame(nextScore);
    }, 150);
  };

  const toggleLanguage = () => {
    const next = isArabic ? 'en' : 'ar';
    setLanguage(next);
    setStoredLanguage(next);
  };

  useEffect(() => {
    if (!DEMO_MODE) return;
    if (phase === 'ready') {
      const timer = window.setTimeout(startNewGame, 350);
      return () => window.clearTimeout(timer);
    }
    if (phase !== 'playing' || resolving || moves <= 0) return;

    if (!selected) {
      const move = findFirstValidSwap(board);
      if (!move) return;
      demoMoveRef.current = move;
      setSelected(move[0]);
      return;
    }

    const move = demoMoveRef.current;
    if (!move || selected[0] !== move[0][0] || selected[1] !== move[0][1]) return;
    const timer = window.setTimeout(() => handleTileClick(move[1][0], move[1][1]), 360);
    return () => window.clearTimeout(timer);
  }, [board, moves, phase, resolving, selected]);

  const statusText = {
    ready: t.ready,
    playing: t.playing,
    invalid: t.invalid,
    matched: t.matched,
  }[statusKey];

  return (
    <main dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen overflow-x-hidden bg-[#12091f] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(126,62,196,0.28),transparent_30%),radial-gradient(circle_at_94%_20%,rgba(245,189,77,0.10),transparent_24%)]" />
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
        <button type="button" onClick={() => navigate('/')} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-bold text-[#eadcf2] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t.home}
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleLanguage} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-black text-[#f5bd4d] transition hover:border-[#f5bd4d]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd4d]">
            <Languages className="h-4 w-4" /> {t.languageShort}
          </button>
          {!user ? (
            <Button type="button" onClick={() => void login()} disabled={isLoading} className="min-h-10 rounded-full bg-[#f5bd4d] px-3 text-xs font-black text-[#28113f] hover:bg-[#ffd36e]">
              <LogIn className="mr-1.5 h-4 w-4" /> {t.signIn}
            </Button>
          ) : (
            <button type="button" onClick={logout} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 text-xs font-bold text-[#eadcf2] transition hover:border-red-300/50 hover:text-red-200">
              <LogOut className="h-4 w-4" /> {t.signOut}
            </button>
          )}
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-5 sm:px-8 sm:pt-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)] lg:items-start lg:gap-10">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#f5bd4d]/25 bg-[#f5bd4d]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f7d98f]">
                <Sparkles className="h-3.5 w-3.5" /> Pi puzzle
              </span>
              <span className="text-xs font-semibold text-[#bba5ca]">{user ? `${t.loggedAs} ${user.username}` : t.guest}</span>
            </div>
            <h1 className="text-4xl font-black tracking-[-0.05em] text-[#fff9ff] sm:text-6xl">{t.brand}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#c9b6d8] sm:text-base">{t.homeSubtitle}</p>
          </div>

          <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a997b9]">{statusText}</p>
                <p className="mt-1 text-sm font-bold text-[#f2e7f7]">{lastGain > 0 ? `+${lastGain} ${t.score}` : t.how3}</p>
              </div>
              <Button type="button" onClick={startNewGame} className="min-h-11 rounded-2xl bg-[#f5bd4d] px-4 text-xs font-black text-[#28113f] hover:bg-[#ffd36e] active:scale-[0.98]">
                <RotateCcw className="mr-1.5 h-4 w-4" /> {t.newGame}
              </Button>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#f5bd4d] transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, (moves / MAX_MOVES) * 100))}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: t.score, value: score, accent: '#f5bd4d' },
            { label: t.best, value: topScore, accent: '#d1a8ff' },
            { label: t.moves, value: moves, accent: '#73d5c0' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-2 py-3 text-center sm:rounded-3xl sm:px-4 sm:py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#a997b9] sm:text-xs">{item.label}</p>
              <p className="mt-1 text-2xl font-black sm:text-4xl" style={{ color: item.accent }}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)] lg:items-start">
          <section className="relative rounded-[2rem] border border-[#f5bd4d]/20 bg-[#1d0c31]/90 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.30)] sm:p-5">
            <div className="mb-3 flex items-center justify-between px-1 sm:mb-4 sm:px-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5bd4d]">{phase === 'paused' ? t.paused : phase === 'over' ? t.gameOver : phase === 'ready' ? t.ready : t.playing}</p>
                <p className="mt-1 text-xs text-[#a997b9]">{t.how1}</p>
              </div>
              {phase === 'playing' && (
                <button type="button" onClick={() => { setPhase('paused'); setSelected(null); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 px-3 text-xs font-bold text-[#eadcf2] transition hover:border-[#f5bd4d]/50 hover:text-white">
                  <Pause className="h-4 w-4" /> {t.pause}
                </button>
              )}
              {phase === 'paused' && (
                <button type="button" onClick={() => setPhase('playing')} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#f5bd4d] px-3 text-xs font-black text-[#28113f] hover:bg-[#ffd36e]">
                  <Play className="h-4 w-4 fill-current" /> {t.resume}
                </button>
              )}
            </div>

            <div className="relative mx-auto w-full max-w-[560px]">
              <div className="grid aspect-square grid-cols-8 gap-1.5 rounded-[1.25rem] border border-white/10 bg-[#12091f] p-1.5 shadow-inner sm:gap-2 sm:rounded-[1.5rem] sm:p-2">
                {board.flatMap((row, rowIndex) => row.map((tile, colIndex) => {
                  const meta = TILE_META[tile.type];
                  const TileIcon = meta.Icon;
                  const isSelected = selected?.[0] === rowIndex && selected?.[1] === colIndex;
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      aria-label={`${meta.label}, ${rowIndex + 1}, ${colIndex + 1}`}
                      onClick={() => handleTileClick(rowIndex, colIndex)}
                      disabled={phase !== 'playing' || resolving}
                      className={`group relative aspect-square min-w-0 overflow-hidden rounded-[0.65rem] border text-white transition duration-150 ease-out sm:rounded-xl ${isSelected ? 'z-10 scale-[1.08] border-[#fff4c8] ring-2 ring-[#f5bd4d] ring-offset-2 ring-offset-[#12091f]' : 'border-white/20'} ${phase === 'playing' ? 'active:scale-95' : 'opacity-90'}`}
                      style={{ background: `linear-gradient(145deg, ${meta.edge} 0%, ${meta.face} 22%, ${meta.face} 70%, #32164f 100%)`, boxShadow: isSelected ? `0 0 22px ${meta.glow}` : `inset 0 1px 0 rgba(255,255,255,.35), 0 4px 10px rgba(0,0,0,.22)` }}
                    >
                      <span className="absolute inset-x-1 top-1 h-1/4 rounded-full bg-white/25 blur-[2px]" />
                      <TileIcon className="relative mx-auto h-[48%] w-[48%] drop-shadow-[0_2px_3px_rgba(30,5,48,.45)] sm:h-1/2 sm:w-1/2" strokeWidth={2.5} />
                      <span className="sr-only">{meta.label}</span>
                    </button>
                  );
                }))}
              </div>

              {phase === 'ready' && (
                <div className="absolute inset-0 grid place-items-center rounded-[1.5rem] bg-[#12091f]/72 p-5 backdrop-blur-[2px]">
                  <div className="max-w-xs text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f5bd4d] text-[#28113f] shadow-[0_0_30px_rgba(245,189,77,.3)]"><Play className="h-7 w-7 fill-current" /></div>
                    <p className="mt-4 text-xl font-black">{t.ready}</p>
                    <p className="mt-2 text-sm leading-6 text-[#c9b6d8]">{t.how2}</p>
                    <Button type="button" onClick={startNewGame} className="mt-5 min-h-12 w-full rounded-2xl bg-[#f5bd4d] font-black text-[#28113f] hover:bg-[#ffd36e] active:scale-[0.98]">{t.startGame}</Button>
                  </div>
                </div>
              )}
              {phase === 'paused' && (
                <div className="absolute inset-0 grid place-items-center rounded-[1.5rem] bg-[#12091f]/78 p-5 backdrop-blur-[2px]">
                  <div className="text-center"><Pause className="mx-auto h-10 w-10 text-[#f5bd4d]" /><p className="mt-3 text-xl font-black">{t.paused}</p><button type="button" onClick={() => setPhase('playing')} className="mt-4 text-sm font-bold text-[#f5bd4d] underline underline-offset-4">{t.resume}</button></div>
                </div>
              )}
              {phase === 'over' && (
                <div className="absolute inset-0 grid place-items-center rounded-[1.5rem] bg-[#12091f]/82 p-5 backdrop-blur-[2px]">
                  <div className="w-full max-w-xs rounded-3xl border border-[#f5bd4d]/30 bg-[#29103f]/95 p-6 text-center shadow-2xl">
                    <Trophy className="mx-auto h-10 w-10 text-[#f5bd4d]" />
                    <p className="mt-3 text-xl font-black">{t.gameOver}</p>
                    <p className="mt-3 text-sm text-[#c9b6d8]">{t.finalScore}</p>
                    <p className="text-4xl font-black text-[#f5bd4d]">{score}</p>
                    <Button type="button" onClick={startNewGame} className="mt-5 min-h-12 w-full rounded-2xl bg-[#f5bd4d] font-black text-[#28113f] hover:bg-[#ffd36e]">{t.playAgain}</Button>
                  </div>
                </div>
              )}
            </div>
            <p role="status" aria-live="polite" className="mt-4 min-h-6 text-center text-xs font-bold text-[#c9b6d8]">{statusText}{lastGain > 0 && statusKey === 'matched' ? `  +${lastGain}` : ''}</p>
          </section>

          <aside className="space-y-4">
            <HighScores language={language} />
            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
              <p className="text-sm font-black text-[#f5bd4d]">{t.howTitle}</p>
              <ol className="mt-3 space-y-3 text-sm leading-6 text-[#c9b6d8]">
                <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f5bd4d] text-xs font-black text-[#28113f]">1</span><span>{t.how1}</span></li>
                <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#8e5dd3] text-xs font-black text-white">2</span><span>{t.how2}</span></li>
                <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#55c5a9] text-xs font-black text-[#102a2a]">3</span><span>{t.how3}</span></li>
              </ol>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
