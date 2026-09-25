import { User } from '../types';
import { STORAGE_KEYS, sleep } from './apiConfig';
import { safeJsonParse } from '../lib/security';

/**
 * UserService Class
 *
 * Manages customer account profile retrieval and field updates
 * with browser localStorage persistence.
 */
class UserService {
  /**
   * Retrieves the current user's profile from localStorage
   */
  async getProfile(): Promise<User | null> {
    await sleep(200);
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    const parsed = safeJsonParse<User | null>(data, null);
    return parsed && typeof parsed === 'object' ? parsed : null;
  }

  /**
   * Updates select fields of the user profile (e.g. name, phone, email)
   *
   * @param updates Partial object containing fields to update
   * @returns Updated User profile
   */
  async updateProfile(updates: Partial<Pick<User, 'name' | 'phone' | 'email'>>): Promise<User> {
    await sleep(400);
    const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!data) throw new Error('No user currently logged in');

    const currentUser = safeJsonParse<User | null>(data, null);
    if (!currentUser || typeof currentUser !== 'object') {
      throw new Error('No user currently logged in');
    }
    const updatedUser: User = {
      ...currentUser,
      ...updates,
    };

    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(updatedUser));
    return updatedUser;
  }
}

// Export singleton instance
export const userService = new UserService();
