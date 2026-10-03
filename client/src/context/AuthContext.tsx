import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import { authService, LoginDTO, RegisterDTO, RegisterResult } from '../services/authService';
import { ApiError, SESSION_EXPIRED_EVENT } from '../lib/api';

/**
 * Interface representing all state variables and dispatch methods
 * exposed by the AuthContext to consuming components.
 */
interface AuthContextType {
  /** The currently authenticated user profile, or null if unauthenticated */
  user: User | null;
  /** Boolean indicating whether a valid user session is active */
  isAuthenticated: boolean;
  /** Loading flag during auth actions and the initial session boot */
  loading: boolean;
  /** True only while the initial GET /auth/me bootstrap is running */
  initializing: boolean;
  /** Set when the last auth action failed with a human-readable message */
  error: string | null;
  /** Sign in using email and password */
  login: (dto: LoginDTO) => Promise<User>;
  /** Start registration — account is created only after email verification */
  register: (dto: RegisterDTO) => Promise<RegisterResult>;
  /** Begin the Google OAuth redirect flow */
  redirectToGoogle: () => void;
  /** Terminate session on the server and purge all client state */
  logout: () => Promise<void>;
  /** Re-sync active user data from the server. Returns the user, or null on failure. */
  refreshUser: () => Promise<User | null>;
  /** Clear any stored auth error */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider
 *
 * Owns the session: bootstraps from GET /api/auth/me, exposes login/register/
 * logout, and reacts to the API client's silent-refresh failures by clearing
 * state and routing to the login screen with a clear reason.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const navigatingRef = useRef(false);
  /** True once a user has actually been signed in during this page session. */
  const hadUserRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Session bootstrap                                                       */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
          if (currentUser) hadUserRef.current = true;
        }
      } catch {
        // Server unreachable: fall back to the last cached profile so the shell
        // still renders instead of appearing logged out.
        if (!cancelled) {
          const cached = authService.getCachedUser();
          setUser(cached);
          if (cached) hadUserRef.current = true;
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    initAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Session expiry (raised by the API client after a failed refresh)        */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const handleExpired = () => {
      const wasSignedIn = hadUserRef.current;
      hadUserRef.current = false;
      setUser(null);

      // A stale token discovered during the initial page load should quietly
      // resolve to "anonymous" rather than bounce a visitor to /login.
      if (!wasSignedIn) return;

      setError('Your session expired. Please sign in again.');
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      navigate('/login?reason=session_expired', { replace: true });
      window.setTimeout(() => {
        navigatingRef.current = false;
      }, 500);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [navigate]);

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                 */
  /* ---------------------------------------------------------------------- */

  const login = useCallback(async (dto: LoginDTO) => {
    setLoading(true);
    setError(null);
    try {
      const loggedIn = await authService.login(dto);
      hadUserRef.current = true;
      setUser(loggedIn);
      return loggedIn;
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : 'Invalid login credentials.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (dto: RegisterDTO) => {
    setLoading(true);
    setError(null);
    try {
      // Registration does NOT create a session — the account is created when
      // the user clicks the emailed verification link.
      return await authService.register(dto);
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : 'Registration failed.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const redirectToGoogle = useCallback(() => {
    setError(null);
    authService.redirectToGoogle();
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      hadUserRef.current = false;
      setUser(null);
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const fresh = await authService.getCurrentUser();
      if (fresh) hadUserRef.current = true;
      setUser(fresh);
      return fresh;
    } catch {
      // keep the existing profile if the refresh call fails
      return null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        initializing,
        error,
        login,
        register,
        redirectToGoogle,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to consume the AuthContext.
 * Throws a descriptive error if called outside of an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
