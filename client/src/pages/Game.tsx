import { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePi } from '@/contexts/PiContext';
import HighScores from '@/components/HighScores';
import { LogOut, LogIn } from 'lucide-react';

const GRID_SIZE = 8;
const TILE_SIZE = 60;
const TILE_TYPES = ['purple', 'gold', 'blue', 'pink', 'green'];

interface Tile {
  type: string;
  row: number;
  col: number;
  matched: boolean;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [gameOver, setGameOver] = useState(false);
  const gridRef = useRef<Tile[][]>([]);
  const selectedTileRef = useRef<{ row: number; col: number } | null>(null);
  const { user, login, logout, saveScore } = usePi();

  // Initialize game grid
  const initializeGrid = () => {
    const newGrid: Tile[][] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      newGrid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        newGrid[row][col] = {
          type: TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)],
          row,
          col,
          matched: false,
        };
      }
    }
    gridRef.current = newGrid;
  };

  // Check for matches
  const checkMatches = () => {
    let matchFound = false;
    const toRemove = new Set<string>();

    // Check horizontal
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const current = gridRef.current[row][col];
        const next1 = gridRef.current[row][col + 1];
        const next2 = gridRef.current[row][col + 2];

        if (current.type === next1.type && next1.type === next2.type) {
          toRemove.add(`${row},${col}`);
          toRemove.add(`${row},${col + 1}`);
          toRemove.add(`${row},${col + 2}`);
          matchFound = true;
        }
      }
    }

    // Check vertical
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const current = gridRef.current[row][col];
        const next1 = gridRef.current[row + 1][col];
        const next2 = gridRef.current[row + 2][col];

        if (current.type === next1.type && next1.type === next2.type) {
          toRemove.add(`${row},${col}`);
          toRemove.add(`${row + 1},${col}`);
          toRemove.add(`${row + 2},${col}`);
          matchFound = true;
        }
      }
    }

    // Remove matched tiles
    toRemove.forEach((key) => {
      const [row, col] = key.split(',').map(Number);
      gridRef.current[row][col].type = '';
      gridRef.current[row][col].matched = true;
    });

    if (matchFound) {
      setScore((prev) => prev + toRemove.size * 10);
    }

    return matchFound;
  };

  // Handle tile click
  const handleTileClick = (row: number, col: number) => {
    if (gameOver || moves === 0) return;

    const selected = selectedTileRef.current;

    if (!selected) {
      selectedTileRef.current = { row, col };
    } else {
      // Check if adjacent
      const isAdjacent =
        (Math.abs(selected.row - row) === 1 && selected.col === col) ||
        (Math.abs(selected.col - col) === 1 && selected.row === row);

      if (isAdjacent) {
        // Swap tiles
        const temp = gridRef.current[selected.row][selected.col].type;
        gridRef.current[selected.row][selected.col].type =
          gridRef.current[row][col].type;
        gridRef.current[row][col].type = temp;

        // Check for matches
        if (checkMatches()) {
          setMoves((prev) => prev - 1);
          if (moves - 1 === 0) {
            setGameOver(true);
          }
        } else {
          // Swap back if no match
          const temp2 = gridRef.current[selected.row][selected.col].type;
          gridRef.current[selected.row][selected.col].type =
            gridRef.current[row][col].type;
          gridRef.current[row][col].type = temp2;
        }
      }

      selectedTileRef.current = null;
    }
  };

  // Initialize Babylon.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BABYLON.Engine(canvasRef.current, true);
    const scene = new BABYLON.Scene(engine);

    engineRef.current = engine;
    sceneRef.current = scene;

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
      'camera',
      Math.PI / 2,
      Math.PI / 2,
      500,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);

    // Lighting
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Initialize grid
    initializeGrid();

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      engine.resize();
    });

    return () => {
      engine.dispose();
      window.removeEventListener('resize', () => {
        engine.resize();
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">Pi Match-3</h1>
          <p className="text-purple-200">Match tiles to earn Pi rewards!</p>
        </div>

        {/* User Info */}
        <div className="flex justify-between items-center mb-6">
          <div>
            {user ? (
              <div className="text-purple-200">
                <p className="text-sm">Logged in as:</p>
                <p className="text-lg font-bold text-yellow-400">{user.username}</p>
              </div>
            ) : (
              <p className="text-purple-300 text-sm">Not logged in</p>
            )}
          </div>
          <Button
            onClick={user ? logout : login}
            className={`flex items-center gap-2 ${
              user
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white font-bold`}
          >
            {user ? (
              <>
                <LogOut className="w-4 h-4" />
                Logout
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Login with Pi
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-white/10 border-purple-400 text-white p-4 text-center">
            <div className="text-sm text-purple-200">Score</div>
            <div className="text-3xl font-bold text-yellow-400">{score}</div>
          </Card>
          <Card className="bg-white/10 border-purple-400 text-white p-4 text-center">
            <div className="text-sm text-purple-200">Moves Left</div>
            <div className="text-3xl font-bold text-yellow-400">{moves}</div>
          </Card>
        </div>

        {/* Game Grid */}
        <div className="bg-white/5 backdrop-blur-md rounded-lg p-6 mb-6 border border-purple-400/30">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}>
            {gridRef.current.map((row, rowIdx) =>
              row.map((tile, colIdx) => (
                <button
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => handleTileClick(rowIdx, colIdx)}
                  className={`w-12 h-12 rounded-lg font-bold text-white transition-all transform hover:scale-110 ${
                    selectedTileRef.current?.row === rowIdx &&
                    selectedTileRef.current?.col === colIdx
                      ? 'ring-4 ring-yellow-400 scale-110'
                      : ''
                  }`}
                  style={{
                    backgroundColor:
                      tile.type === 'purple'
                        ? '#a855f7'
                        : tile.type === 'gold'
                          ? '#fbbf24'
                          : tile.type === 'blue'
                            ? '#3b82f6'
                            : tile.type === 'pink'
                              ? '#ec4899'
                              : '#22c55e',
                  }}
                >
                  {tile.type.charAt(0).toUpperCase()}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Game Over Modal */}
        {gameOver && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="bg-purple-900 border-yellow-400 p-8 text-center max-w-sm">
              <h2 className="text-2xl font-bold text-white mb-4">Game Over!</h2>
              <p className="text-purple-200 mb-6">
                Final Score: <span className="text-yellow-400 font-bold">{score}</span>
              </p>
              <Button
                onClick={() => {
                  saveScore(score);
                  setScore(0);
                  setMoves(20);
                  setGameOver(false);
                  initializeGrid();
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold mb-4"
              >
                Play Again
              </Button>
            </Card>
          </div>
        )}

        {/* High Scores */}
        <div className="mb-6">
          <HighScores />
        </div>

        {/* Instructions */}
        <div className="bg-white/5 backdrop-blur-md rounded-lg p-4 border border-purple-400/30 text-purple-200 text-sm">
          <p className="mb-2">
            <strong>How to Play:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Click a tile to select it</li>
            <li>Click an adjacent tile to swap</li>
            <li>Match 3 or more tiles in a row</li>
            <li>You have 20 moves to get the highest score</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
