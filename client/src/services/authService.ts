import { User } from '../types';
import { STORAGE_KEYS, sleep } from './apiConfig';

/**
 * Data Transfer Object for user registration
 */
export interface RegisterDTO {
  name: string;
  email: string;
  phone: string;
  password: string;
}

/**
 * Data Transfer Object for user sign-in
 */
export interface LoginDTO {
  email: string;
  password: string;
}

/**
 * Default seeded customer profile used for immediate live demonstration
 */
const DEFAULT_USER: User = {
  id: 'usr_ip_01',
  name: 'Arjun Sen',
  email: 'arjun.sen@guitarist.in',
  phone: '+91 98301 23456',
  isEmailVerified: true,
  isPhoneVerified: true,
  createdAt: '2026-08-15T10:00:00Z',
};

/**
 * AuthService Class
 *
 * Handles user authentication operations, credentials validation,
 * token storage, and session caching in browser localStorage.
 */
class AuthService {
  /**
   * Helper: retrieves the stored user from browser localStorage
   */
  private getStoredUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Helper: persists user and token in browser localStorage, or clears them
   */
  private setStoredUser(user: User | null, token = 'jwt_mock_token_7792') {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  }

  /**
   * Retrieves the currently active user session
   */
  async getCurrentUser(): Promise<User | null> {
    await sleep(200);
    return this.getStoredUser();
  }

  /**
   * Authenticates a user with email and password
   *
   * @param credentials Email and password inputs
   * @returns The authenticated User object
   */
  async login({ email, password }: LoginDTO): Promise<User> {
    await sleep(500);

    if (!email || !password) {
      throw new Error('Please enter both email and password.');
    }

    // If an existing registered user matches the email, log in with that profile
    const stored = this.getStoredUser();
    if (stored && stored.email.toLowerCase() === email.toLowerCase()) {
      this.setStoredUser(stored);
      return stored;
    }

    // Default authenticated user creation for frictionless testing
    const user: User = {
      id: `usr_${Date.now()}`,
      name: email.split('@')[0].replace(/[^a-zA-Z]/g, ' ') || 'Player One',
      email: email.toLowerCase(),
      phone: '+91 98765 43210',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date().toISOString(),
    };

    this.setStoredUser(user);
    return user;
  }

  /**
   * Registers a new user account with validation
   *
   * @param data Registration details
   * @returns Newly created User profile
   */
  async register({ name, email, phone, password }: RegisterDTO): Promise<User> {
    await sleep(600);

    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '+91 98000 00000',
      isEmailVerified: false,
      isPhoneVerified: false,
      createdAt: new Date().toISOString(),
    };

    this.setStoredUser(newUser);
    return newUser;
  }

  /**
   * Simulates an instantaneous Google OAuth login
   */
  async googleLogin(): Promise<User> {
    await sleep(600);
    const googleUser: User = {
      id: `usr_g_${Date.now()}`,
      name: 'Independent Musician',
      email: 'indie.player@gmail.com',
      phone: '+91 98310 11223',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date().toISOString(),
    };
    this.setStoredUser(googleUser);
    return googleUser;
  }

  /**
   * Verifies the email confirmation code
   */
  async verifyEmail(code: string): Promise<boolean> {
    await sleep(400);
    if (!code || code.length < 4) {
      throw new Error('Invalid verification code entered.');
    }
    const current = this.getStoredUser();
    if (current) {
      current.isEmailVerified = true;
      this.setStoredUser(current);
    }
    return true;
  }

  /**
   * Verifies the mobile phone SMS OTP code
   */
  async verifyPhone(otp: string): Promise<boolean> {
    await sleep(400);
    if (!otp || otp.length < 4) {
      throw new Error('Please enter the 4-digit OTP code sent to your phone.');
    }
    const current = this.getStoredUser();
    if (current) {
      current.isPhoneVerified = true;
      this.setStoredUser(current);
    }
    return true;
  }

  /**
   * Simulates refreshing the JWT bearer token
   */
  async refreshToken(): Promise<string> {
    await sleep(150);
    return 'refreshed_mock_jwt_token_9918';
  }

  /**
   * Logs out the current user and clears session storage
   */
  async logout(): Promise<void> {
    await sleep(200);
    this.setStoredUser(null);
  }
}

// Export singleton instance for app-wide consumption
export const authService = new AuthService();
