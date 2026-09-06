import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import * as authService from '../services/authService';
import { setAuthToken, setUnauthorizedHandler } from '../services/api';
import { DriverProfileInfo, SafeUser } from '../types/models';

type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: SafeUser | null;
  driverProfile: DriverProfileInfo | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUser] = useState<SafeUser | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfileInfo | null>(null);

  const forceLogout = useCallback(async (): Promise<void> => {
    await authService.clearStoredToken();
    setAuthToken(null);
    setUser(null);
    setDriverProfile(null);
    setStatus('unauthenticated');
  }, []);

  // Session restore: read token from the secure store, validate it server-side.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      forceLogout();
    });

    (async () => {
      try {
        const token = await authService.loadStoredToken();
        if (!token) {
          setStatus('unauthenticated');
          return;
        }
        setAuthToken(token);
        const me = await authService.fetchMe();
        setUser(me.user);
        setDriverProfile(me.driver);
        setStatus('authenticated');
      } catch {
        await forceLogout();
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [forceLogout]);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const result = await authService.login(email.trim().toLowerCase(), password);
    setAuthToken(result.token);
    await authService.persistToken(result.token);
    const me = await authService.fetchMe();
    setUser(me.user);
    setDriverProfile(me.driver);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, driverProfile, login, logout: forceLogout }),
    [status, user, driverProfile, login, forceLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}