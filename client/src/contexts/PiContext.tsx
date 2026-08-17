import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

/**
 * Style reminder for this context: keep authentication behavior calm, explicit,
 * and trustworthy; never simulate a Pi identity in production.
 */

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

interface PiAuthResponse {
  user: {
    uid: string;
    username: string;
  };
  accessToken: string;
}

interface PiSdk {
  init: (options: { version: string; sandbox?: boolean }) => Promise<void> | void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound?: (payment: unknown) => void,
  ) => Promise<PiAuthResponse>;
  logout?: () => void;
}

declare global {
  interface Window {
    Pi?: PiSdk;
  }
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

const PI_INIT_OPTIONS = {
  version: '2.0',
  // This app is registered as a Pi Testnet app. Remove sandbox when the
  // Developer Portal app is moved to Mainnet.
  sandbox: true,
} as const;

const waitForPiSdk = async (): Promise<PiSdk | null> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (window.Pi) return window.Pi;
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }
  return null;
};

const onIncompletePaymentFound = (payment: unknown) => {
  // This game does not currently create payments, but the callback is required
  // by the Pi SDK authentication flow and is kept ready for future payments.
  console.info('Pi SDK reported an incomplete payment:', payment);
};

const mapAuthResponse = (auth: PiAuthResponse): PiUser => ({
  uid: auth.user.uid,
  username: auth.user.username,
  accessToken: auth.accessToken,
});

export const PiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const piInitialization = useRef<Promise<PiSdk> | null>(null);

  const getInitializedPi = async (): Promise<PiSdk> => {
    if (!piInitialization.current) {
      piInitialization.current = (async () => {
        const sdk = await waitForPiSdk();
        if (!sdk) {
          throw new Error('Pi SDK is unavailable. Open the app in Pi Browser.');
        }
        await sdk.init(PI_INIT_OPTIONS);
        return sdk;
      })();
    }
    return piInitialization.current;
  };

  useEffect(() => {
    const stored = localStorage.getItem('pi-match3-scores');
    if (stored) {
      try {
        setHighScores(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load high scores:', error);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializePiAndRestoreSession = async () => {
      try {
        const sdk = await getInitializedPi();
        const auth = await sdk.authenticate(['username'], onIncompletePaymentFound);
        if (mounted && auth) setUser(mapAuthResponse(auth));
      } catch (error) {
        // A first-load auth rejection is not a fatal game error. The user can
        // explicitly press Login with Pi after opening the app in Pi Browser.
        console.info('Pi session was not restored:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void initializePiAndRestoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
      const sdk = await getInitializedPi();
      const auth = await sdk.authenticate(['username'], onIncompletePaymentFound);
      if (auth) setUser(mapAuthResponse(auth));
    } catch (error) {
      console.error('Pi login error:', error);
      alert('لم يتم تسجيل الدخول. افتح التطبيق من داخل Pi Browser ثم حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      window.Pi?.logout?.();
    } catch (error) {
      console.error('Pi logout error:', error);
    }
  };

  const saveScore = async (score: number) => {
    const newScore: HighScore = {
      username: user?.username ?? 'Anonymous',
      score,
      date: new Date().toISOString(),
    };

    const updated = [...highScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setHighScores(updated);
    localStorage.setItem('pi-match3-scores', JSON.stringify(updated));

    // The static deployment has no score API yet. Keep the local leaderboard
    // working without exposing a Pi access token to an unverified endpoint.
  };

  return (
    <PiContext.Provider value={{ user, isLoading, highScores, login, logout, saveScore }}>
      {children}
    </PiContext.Provider>
  );
};

export const usePi = () => {
  const context = useContext(PiContext);
  if (!context) throw new Error('usePi must be used within PiProvider');
  return context;
};
