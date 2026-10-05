/**
 * Signed-in/out reliability across reloads.
 *
 * Proven bug: when the logout request never reaches the server (network
 * failure, timeout), the server session and httpOnly refresh cookie survive.
 * On the next load the silent refresh then resurrects the session and the
 * user appears signed in again. These tests drive AuthService with stubbed
 * storage + fetch through that exact sequence.
 *
 * Run: node --import tsx --test tests/authSession.test.ts
 */
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STORAGE_KEYS } from '../src/services/apiConfig';

const createMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string): string | null =>
      store.has(key) ? (store.get(key) as string) : null,
    setItem: (key: string, value: string): void => {
      store.set(String(key), String(value));
    },
    removeItem: (key: string): void => {
      store.delete(String(key));
    },
    clear: (): void => {
      store.clear();
    },
    get length(): number {
      return store.size;
    },
    key: (index: number): string | null => [...store.keys()][index] ?? null,
  };
};

type RouteHandler = (url: string, init: RequestInit) => Response | Promise<Response> | never;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const requestedUrls: string[] = [];

const setFetch = (handler: RouteHandler): void => {
  (globalThis as Record<string, unknown>).fetch = async (
    input: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const url = String(input);
    requestedUrls.push(url);
    return handler(url, init ?? {});
  };
};

// AuthService holds no module-level session state (everything lives in
// storage + fetch, both mocked per test), so one static import is safe.
import { authService } from '../src/services/authService';

const signedInUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  phone: '9876543210',
  addresses: [],
};

const seedSignedIn = (): void => {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'stale-access-token');
  localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(signedInUser));
};

describe('auth session across reload', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).localStorage = createMemoryStorage();
    (globalThis as Record<string, unknown>).sessionStorage = createMemoryStorage();
    requestedUrls.length = 0;
    setFetch(() => {
      throw new Error('fetch stub not configured for this test');
    });
  });

  it('a failed logout cannot resurrect on the next load', async () => {
    seedSignedIn();

    setFetch(async (url, init) => {
      const method = (init.method ?? 'GET').toUpperCase();
      // The logout request never reaches the server (offline / timeout).
      if (url.endsWith('/auth/logout')) throw new Error('network down');
      // Silent refresh SUCCEEDS: the orphaned refresh cookie is still alive
      // server-side, exactly the failed-logout aftermath.
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'resurrected-token' });
      }
      if (url.endsWith('/auth/me')) {
        const auth = (init.headers as Record<string, string>)?.Authorization ?? '';
        if (auth === 'Bearer resurrected-token') {
          return jsonResponse({ data: { user: signedInUser } });
        }
        return jsonResponse({ message: 'Unauthorized' }, 401);
      }
      throw new Error(`unexpected request ${method} ${url}`);
    });

    await authService.logout();

    // Local state is purged even though the server call failed.
    assert.equal(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), null);
    assert.equal(localStorage.getItem(STORAGE_KEYS.AUTH_USER), null);

    // Next load: must stay signed OUT despite the live server session, and
    // must not even attempt the refresh that would resurrect it.
    const callsBefore = requestedUrls.length;
    const user = await authService.getCurrentUser();
    assert.equal(user, null);
    assert.equal(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), null);
    assert.deepEqual(
      requestedUrls.slice(callsBefore).filter((url) => url.endsWith('/auth/refresh')),
      []
    );
  });

  it('401/403 from /me clears the cached user and renders signed out', async () => {
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(signedInUser));

    setFetch(async (url) => {
      if (url.endsWith('/auth/me')) return jsonResponse({ message: 'Unauthorized' }, 401);
      if (url.endsWith('/auth/refresh')) return jsonResponse({ message: 'Unauthorized' }, 401);
      throw new Error(`unexpected request ${url}`);
    });

    const user = await authService.getCurrentUser();
    assert.equal(user, null);
    assert.equal(localStorage.getItem(STORAGE_KEYS.AUTH_USER), null);
  });

  it('network failure keeps showing the cached profile (offline rule)', async () => {
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(signedInUser));

    setFetch(async () => {
      throw new Error('network down');
    });

    // getCurrentUser has no cached-token path here; the AuthContext fallback
    // reads the cache directly. Assert the cache survives a network failure.
    await assert.rejects(authService.getCurrentUser(), /could not reach/i);
    assert.equal(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_USER) as string).email,
      'test@example.com'
    );
  });

  it('a valid session survives reload, including silent access-token refresh', async () => {
    seedSignedIn();

    setFetch(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'fresh-access-token' });
      }
      if (url.endsWith('/auth/me')) {
        const auth = (init.headers as Record<string, string>)?.Authorization ?? '';
        if (auth === 'Bearer fresh-access-token') {
          return jsonResponse({ data: { user: signedInUser } });
        }
        return jsonResponse({ message: 'Unauthorized' }, 401);
      }
      throw new Error(`unexpected request ${url}`);
    });

    const user = await authService.getCurrentUser();
    assert.deepEqual(user?.email, 'test@example.com');
    assert.equal(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN), 'fresh-access-token');
  });

  it('a best-effort cleanup call goes out on the next boot after a failed logout', async () => {
    seedSignedIn();

    // Logout fails server-side; the session stays alive there.
    setFetch(async (url) => {
      if (url.endsWith('/auth/logout')) throw new Error('network down');
      throw new Error(`unexpected request ${url}`);
    });
    await authService.logout();

    // Next boot: the cleanup call must be attempted before anything else,
    // and once it lands the signed-out marker is gone.
    setFetch(async (url) => {
      if (url.endsWith('/auth/logout')) return jsonResponse({ success: true });
      if (url.endsWith('/auth/me')) return jsonResponse({ message: 'Unauthorized' }, 401);
      if (url.endsWith('/auth/refresh')) return jsonResponse({ message: 'Unauthorized' }, 401);
      throw new Error(`unexpected request ${url}`);
    });

    const user = await authService.bootstrapSession();
    assert.equal(user, null);
    assert.ok(
      requestedUrls.some((url) => url.endsWith('/auth/logout')),
      'expected a cleanup logout call on boot'
    );
    assert.equal(localStorage.getItem(STORAGE_KEYS.SIGNED_OUT), null);
  });
});
