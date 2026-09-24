import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { authService, LoginDTO, RegisterDTO } from '../services/authService';

/**
 * Interface representing all state variables and dispatch methods
 * exposed by the AuthContext to consuming components.
 */
interface AuthContextType {
  /** The currently authenticated user profile, or null if unauthenticated */
  user: User | null;
  /** Boolean indicating whether a valid user session is active */
  isAuthenticated: boolean;
  /** Loading flag set during async auth actions and initial session boot */
  loading: boolean;
  /** Sign in using email and password */
  login: (dto: LoginDTO) => Promise<User>;
  /** Register a new account with email, name, phone, and password */
  register: (dto: RegisterDTO) => Promise<User>;
  /** Instant Google OAuth authentication simulation */
  googleLogin: () => Promise<User>;
  /** Verify email address with 6-digit confirmation code */
  verifyEmail: (code: string) => Promise<boolean>;
  /** Verify mobile phone with 4-digit SMS OTP */
  verifyPhone: (otp: string) => Promise<boolean>;
  /** Terminate session, remove tokens, and clear user state */
  logout: () => Promise<void>;
  /** Re-sync active user data from storage or API */
  refreshUser: () => Promise<void>;
}

// Create the Context with undefined as initial value to enforce provider usage
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 *
 * Wraps the application to provide user session state, local persistence,
 * and authentication operations (login, register, email/phone verification).
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State: holds the active user profile or null
  const [user, setUser] = useState<User | null>(null);
  // State: tracks initial session restoration from localStorage
  const [loading, setLoading] = useState(true);

  /**
   * Initializes auth state on mount by retrieving stored user data
   */
  const initAuth = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run initialization once on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  /**
   * Logs in a user with email and password
   */
  const login = async (dto: LoginDTO) => {
    setLoading(true);
    try {
      const loggedIn = await authService.login(dto);
      setUser(loggedIn);
      return loggedIn;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registers a new user account
   */
  const register = async (dto: RegisterDTO) => {
    setLoading(true);
    try {
      const registered = await authService.register(dto);
      setUser(registered);
      return registered;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Simulates Google OAuth One-Tap sign-in
   */
  const googleLogin = async () => {
    setLoading(true);
    try {
      const loggedIn = await authService.googleLogin();
      setUser(loggedIn);
      return loggedIn;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifies email using verification code and updates local state flag
   */
  const verifyEmail = async (code: string) => {
    const success = await authService.verifyEmail(code);
    if (success && user) {
      setUser({ ...user, isEmailVerified: true });
    }
    return success;
  };

  /**
   * Verifies mobile phone number via SMS OTP code
   */
  const verifyPhone = async (otp: string) => {
    const success = await authService.verifyPhone(otp);
    if (success && user) {
      setUser({ ...user, isPhoneVerified: true });
    }
    return success;
  };

  /**
   * Signs out user and clears local session cache
   */
  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  /**
   * Re-fetches the current user profile
   */
  const refreshUser = async () => {
    const fresh = await authService.getCurrentUser();
    setUser(fresh);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        googleLogin,
        verifyEmail,
        verifyPhone,
        logout,
        refreshUser,
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
