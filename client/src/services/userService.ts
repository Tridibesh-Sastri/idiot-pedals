import { ApiError, api } from '../lib/api';
import { normalizeUser } from '../lib/normalize';
import { sanitizeAddressForPayload, type CleanAddressPayload } from '../lib/validation';
import type { User, UserAddress } from '../types';

/** Only the fields the API actually accepts on PATCH /api/users/me. */
export interface ProfileUpdate {
  name?: string;
  phone?: string;
  addresses?: (UserAddress | CleanAddressPayload)[];
}

interface MeEnvelope {
  message?: string;
  data?: { user?: unknown };
}

/**
 * Profile service backed by GET/PATCH /api/users/me.
 *
 * There is no local persistence here: the server is the single source of truth,
 * so a change made on another device (or a failed request) can never leave a
 * stale profile cached in this browser.
 */
class UserService {
  /** Current profile, or null when not signed in. */
  async getProfile(): Promise<User | null> {
    try {
      const envelope = await api.get<MeEnvelope>('/users/me');
      const user = envelope?.data?.user;

      return user ? normalizeUser(user) : null;
    } catch (error) {
      // Not signed in (or the session expired) is a normal state, not an error.
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Updates the caller's name, phone and/or full address list.
   *
   * The server whitelists these fields and rejects everything else, so any
   * other key is stripped here rather than being sent and 400ed. Addresses
   * always replace the whole list (add/edit/delete/set-default all send the
   * resulting array).
   */
  async updateProfile(updates: ProfileUpdate): Promise<User> {
    const payload: { name?: string; phone?: string; addresses?: CleanAddressPayload[] } = {};

    if (typeof updates.name === 'string') payload.name = updates.name.trim();
    if (typeof updates.phone === 'string') payload.phone = updates.phone.trim();
    if (Array.isArray(updates.addresses)) {
      payload.addresses = updates.addresses.map((a) => sanitizeAddressForPayload(a as unknown as Record<string, unknown>));
    }

    if (payload.name === undefined && payload.phone === undefined && payload.addresses === undefined) {
      throw new ApiError('validation', 'Nothing to update.');
    }

    const envelope = await api.patch<MeEnvelope>('/users/me', payload);
    const user = envelope?.data?.user;

    if (!user) {
      throw new ApiError('server', 'The server did not return the updated profile.');
    }

    return normalizeUser(user);
  }
}

// Export singleton instance
export const userService = new UserService();
