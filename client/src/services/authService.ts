import { ApiError, api, apiUrl, publicApi, setAccessToken } from '../lib/api';
import { normalizeUser } from '../lib/normalize';
import { safeJsonParse, secureStorage } from '../lib/security';
import type { ServerUser, User, UserAddress } from '../types';
import { STORAGE_KEYS } from './apiConfig';

/**
 * Data Transfer Object for user registration.
 * `addresses` matches the backend's address schema (POST /api/auth/register).
 */
export interface RegisterDTO {
  name: string;
  email: string;
  phone: string;
  password: string;
  addresses: UserAddress[];
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterResult {
  email: string;
  name: string;
  message: string;
  retryAfterSeconds?: number;
}

export type EmailVerificationOutcome = 'verified' | 'already_verified' | 'expired' | 'invalid';

export interface EmailVerificationResult {
  outcome: EmailVerificationOutcome;
  message: string;
}

export interface ResendVerificationResult {
  message: string;
  retryAfterSeconds: number;
}

interface LoginEnvelope {
  message?: string;
  data?: { user?: ServerUser; accessToken?: string };
}

interface MeEnvelope {
  data?: { user?: ServerUser };
}

interface RegisterEnvelope {
  message?: string;
  data?: { name?: string; email?: string };
  retryAfterSeconds?: number;
}

/**
 * AuthService
 *
 * Real API-backed authentication. Every call goes through the shared API client
 * so error classification, Bearer attachment and silent refresh stay centralised.
 */
class AuthService {
  /* ---------------------------------------------------------------------- */
  /* Local session cache (display only — the server is the source of truth)  */
  /* ---------------------------------------------------------------------- */

  getCachedUser(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      const parsed = safeJsonParse<ServerUser | null>(raw, null);
      return normalizeUser(parsed);
    } catch {
      return null;
    }
  }

  private cacheUser(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } catch {
      /* storage unavailable — session still works in memory */
    }
  }

  private clearCachedUser(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    } catch {
      /* ignore */
    }
  }

  private isSignedOutFlag(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEYS.SIGNED_OUT) === 'true';
    } catch {
      return false;
    }
  }

  private setSignedOutFlag(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SIGNED_OUT, 'true');
    } catch {
      /* storage unavailable — refresh gate simply stays open */
    }
  }

  private clearSignedOutFlag(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SIGNED_OUT);
    } catch {
      /* ignore */
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Login                                                                   */
  /* ---------------------------------------------------------------------- */

  async login({ email, password }: LoginDTO): Promise<User> {
    const envelope = await publicApi.post<LoginEnvelope>('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });

    const accessToken = envelope?.data?.accessToken;
    const user = normalizeUser(envelope?.data?.user);

    if (typeof accessToken !== 'string' || !accessToken || !user) {
      throw new ApiError('server', 'Login succeeded but the server response was incomplete. Please try again.');
    }

    setAccessToken(accessToken);
    this.cacheUser(user);
    this.clearSignedOutFlag();
    return user;
  }

  /**
   * Bootstraps the session on page load. If a previous explicit logout never
   * reached the server (its session may still be alive), make a best-effort
   * cleanup call first so a stale refresh cookie cannot resurrect the session
   * below. The flag is consumed only when the cleanup actually reaches the
   * server; otherwise it stays set and keeps refusing silent refresh.
   */
  async bootstrapSession(): Promise<User | null> {
    if (this.isSignedOutFlag()) {
      try {
        await api.post('/auth/logout', undefined, { retryOn401: false, timeoutMs: 5000 });
        this.clearSignedOutFlag();
      } catch {
        /* unreachable server: flag stays set, refresh stays refused */
      }
    }

    return this.getCurrentUser();
  }

  /* ---------------------------------------------------------------------- */
  /* Register (two-step: account is created only after email verification)   */
  /* ---------------------------------------------------------------------- */

  async register({ name, email, phone, password, addresses }: RegisterDTO): Promise<RegisterResult> {
    const cleanEmail = email.trim().toLowerCase();

    const envelope = await publicApi.post<RegisterEnvelope>('/auth/register', {
      name: name.trim(),
      email: cleanEmail,
      phone: phone.replace(/\D/g, '').slice(0, 20),
      password,
      addresses: addresses.map((address) => ({
        label: address.label?.trim() || 'Home',
        name: address.name.trim(),
        phone: address.phone.replace(/\D/g, '').slice(0, 10),
        addressLine1: address.addressLine1.trim(),
        addressLine2: address.addressLine2?.trim() || undefined,
        city: address.city.trim(),
        state: address.state.trim(),
        postalCode: address.postalCode.replace(/\D/g, '').slice(0, 20),
        country: address.country.trim() || 'India',
        isDefault: Boolean(address.isDefault),
      })),
    });

    return {
      email: envelope?.data?.email ?? cleanEmail,
      name: envelope?.data?.name ?? name.trim(),
      message:
        envelope?.message ??
        'Registration started successfully. Please check your email to verify your account.',
      retryAfterSeconds:
        typeof envelope?.retryAfterSeconds === 'number'
          ? envelope.retryAfterSeconds
          : undefined,
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Session bootstrap                                                       */
  /* ---------------------------------------------------------------------- */

  /**
   * Resolves the current user via GET /api/auth/me.
   * Returns null for anonymous visitors (no forced redirect).
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const envelope = await api.get<MeEnvelope>('/auth/me');
      const user = normalizeUser(envelope?.data?.user);

      if (!user) {
        this.clearCachedUser();
        return null;
      }

      this.cacheUser(user);
      this.clearSignedOutFlag();
      return user;
    } catch (error) {
      if (error instanceof ApiError && (error.kind === 'unauthorized' || error.kind === 'forbidden')) {
        this.clearCachedUser();
        return null;
      }
      // Network / server failure: keep the last known profile so the shell still
      // renders instead of dumping the user to a login screen.
      throw error;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Google OAuth (redirect flow)                                            */
  /* ---------------------------------------------------------------------- */

  /**
   * Sends the browser to the backend OAuth start endpoint. The backend then
   * redirects to Google. NOTE: completing the flow requires the backend's
   * `/api/auth/google/callback` to redirect back into the SPA with a session —
   * today it returns JSON, so the redirect lands on a raw response.
   */
  redirectToGoogle(): void {
    window.location.assign(apiUrl('/auth/google'));
  }

  /* ---------------------------------------------------------------------- */
  /* Email verification (token link landed from the inbox)                   */
  /* ---------------------------------------------------------------------- */

  /**
   * Verifies an emailed token.
   *
   * The outcomes are distinguished by HTTP status, which the API documents:
   *   200 EMAIL_VERIFIED            -> verified
   *   400 EMAIL_TOKEN_INVALID       -> invalid
   *   410 EMAIL_TOKEN_EXPIRED       -> expired
   *   409 ACCOUNT_ALREADY_VERIFIED  -> already_verified
   *
   * Message text is deliberately not pattern-matched any more: copy edits used
   * to be able to change application behaviour.
   */
  async verifyEmailToken(token: string): Promise<EmailVerificationResult> {
    if (!token) {
      return { outcome: 'invalid', message: 'This verification link is missing its token.' };
    }

    try {
      // Single POST with the token in the JSON body: the link itself never
      // consumes anything, so scanners and prefetchers cannot burn the token.
      const envelope = await publicApi.post<{ message?: string }>(
        '/auth/verify-email',
        { token }
      );

      return {
        outcome: 'verified',
        message: envelope?.message ?? 'Email verified successfully. Your account has been created.',
      };
    } catch (error) {
      if (error instanceof ApiError) {
        const fallback = 'This verification link is not valid. It may have already been used.';

        if (error.status === 409) {
          return {
            outcome: 'already_verified',
            message: error.message || 'This email address already has a verified account.',
          };
        }

        if (error.status === 410) {
          return {
            outcome: 'expired',
            message: error.message || 'This verification link has expired.',
          };
        }

        if (error.status === 400) {
          return {
            outcome: 'invalid',
            message: error.message || fallback,
          };
        }
      }

      throw error;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Resend verification mail (generic response by design)                     */
  /* ---------------------------------------------------------------------- */

  /**
   * Asks for a fresh verification mail. The server answers the same generic
   * 200 body whether or not an address is pending, so the message here must
   * never branch on existence.
   */
  async resendVerificationEmail(email: string): Promise<ResendVerificationResult> {
    const envelope = await publicApi.post<{
      message?: string;
      retryAfterSeconds?: number;
    }>('/auth/resend-verification', { email });

    return {
      message:
        envelope?.message ??
        'If a verification email is pending for this address, a new link is on its way. Only the newest email works.',
      retryAfterSeconds:
        typeof envelope?.retryAfterSeconds === 'number' ? envelope.retryAfterSeconds : 60,
    };
  }

  /* ---------------------------------------------------------------------- */
  /* Logout                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * Best-effort server logout + guaranteed full client cleanup.
   * Always runs `clearAuthData()` (tokens, profile, cart, orders, session).
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', undefined, { retryOn401: false });
    } catch {
      // Even if the network call fails, local session data must be purged.
    } finally {
      setAccessToken(null);
      this.clearCachedUser();
      secureStorage.clearAuthData();
      // Record the explicit intent AFTER purging: if the server call above
      // never landed, the refresh cookie may still be alive server-side.
      this.setSignedOutFlag();
    }
  }
}

// Export singleton instance for app-wide consumption
export const authService = new AuthService();
