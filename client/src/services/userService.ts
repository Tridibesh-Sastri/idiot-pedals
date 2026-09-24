import { User } from '../types';
import { STORAGE_KEYS, sleep } from './apiConfig';

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
    return data ? JSON.parse(data) : null;
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

    const currentUser: User = JSON.parse(data);
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
