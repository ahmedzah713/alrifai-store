import React, { createContext, useContext, useEffect, useState } from 'react';

interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
}

interface HighScore {
  username: string;
  score: number;
  date: string;
}

interface PiContextType {
  user: PiUser | null;
  isLoading: boolean;
  highScores: HighScore[];
  login: () => Promise<void>;
  logout: () => void;
  saveScore: (score: number) => Promise<void>;
}

const PiContext = createContext<PiContextType | undefined>(undefined);

export const PiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [highScores, setHighScores] = useState<HighScore[]>([]);

  // Load high scores from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pi-match3-scores');
    if (stored) {
      try {
        setHighScores(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load high scores:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Initialize Pi SDK
  useEffect(() => {
    const initPi = async () => {
      try {
        // Check if Pi SDK is available
        if (typeof (window as any).Pi !== 'undefined') {
          const Pi = (window as any).Pi;
          
          // Initialize Pi
          await Pi.init({ version: '2.0', app_id: 'pi-match3-game' });
          
          // Check if user is already authenticated
          const auth = await Pi.authenticate();
          if (auth) {
            setUser({
              uid: auth.user.uid,
              username: auth.user.username,
              accessToken: auth.accessToken,
            });
          }
        }
      } catch (error) {
        console.error('Pi initialization error:', error);
      }
    };

    initPi();
  }, []);

  const login = async () => {
    try {
      const Pi = (window as any).Pi;
      if (!Pi) {
        alert('Pi SDK not available. Please use Pi Browser.');
        return;
      }

      const auth = await Pi.authenticate();
      if (auth) {
        setUser({
          uid: auth.user.uid,
          username: auth.user.username,
          accessToken: auth.accessToken,
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login with Pi');
    }
  };

  const logout = () => {
    setUser(null);
    try {
      const Pi = (window as any).Pi;
      if (Pi && Pi.logout) {
        Pi.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const saveScore = async (score: number) => {
    if (!user) {
      // Save anonymously
      const newScore: HighScore = {
        username: 'Anonymous',
        score,
        date: new Date().toISOString(),
      };
      const updated = [...highScores, newScore].sort((a, b) => b.score - a.score).slice(0, 10);
      setHighScores(updated);
      localStorage.setItem('pi-match3-scores', JSON.stringify(updated));
      return;
    }

    // Save with user
    const newScore: HighScore = {
      username: user.username,
      score,
      date: new Date().toISOString(),
    };

    const updated = [...highScores, newScore].sort((a, b) => b.score - a.score).slice(0, 10);
    setHighScores(updated);
    localStorage.setItem('pi-match3-scores', JSON.stringify(updated));

    // Optionally send to backend
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          uid: user.uid,
          score,
          accessToken: user.accessToken,
        }),
      });
    } catch (error) {
      console.error('Failed to save score to backend:', error);
    }
  };

  return (
    <PiContext.Provider value={{ user, isLoading, highScores, login, logout, saveScore }}>
      {children}
    </PiContext.Provider>
  );
};

export const usePi = () => {
  const context = useContext(PiContext);
  if (!context) {
    throw new Error('usePi must be used within PiProvider');
  }
  return context;
};
