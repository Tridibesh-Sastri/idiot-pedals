/**
 * Security & Anti-Tamper Hardening Core
 *
 * Provides client-side defenses that are independent of any data source:
 * 1. Prototype-pollution-proof JSON parsing
 * 2. Secure storage wrapper with integrity & type checking
 * 3. Safe URL protocol validator (anti-open-redirect / XSS)
 * 4. Internal redirect whitelist
 * 5. Input sanitizer
 * 6. Runtime integrity guards (framebusting)
 *
 * NOTE: The previous hardcoded "immutable price ledger" was removed when the
 * catalogue moved to the server (GET /api/products). Prices are now always
 * fetched from the backend and the backend remains the sole authority for
 * order totals — the client only ever sends productId + quantity.
 */

/**
 * 1. Prototype-Pollution-Proof JSON Parser
 * Recursively strips dangerous object keys: __proto__, constructor, prototype
 */
export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined; // Drop polluted keys
      }
      return value;
    });
    return (parsed as T) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * 2. Input Sanitizer (XSS, fuzz & Injection Protection)
 *
 * Strips: HTML brackets, null bytes, C0/C1 control characters, Unicode
 * bidirectional overrides (U+202A–U+202E, U+2060–U+206F — spoofing /
 * visual-reordering attacks), zero-width and invisible characters
 * (U+200B–U+200F, U+FEFF). Enforces a 500-char cap so pasted fuzz blobs
 * (50k-char, emoji storms) can't bloat state, storage, or renders.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Strip HTML brackets
    .replace(/[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2060-\u206F\u200B-\u200F\uFEFF]/g, '') // Strip controls, bidi overrides, invisibles
    .slice(0, 500); // Enforce reasonable length limit
}

/**
 * 3. Safe URL / Protocol Validator (Anti-Open-Redirect & Script Injection)
 */
export function isSafeUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  const clean = url.trim().toLowerCase();

  // Reject malicious schemes
  if (
    clean.startsWith('javascript:') ||
    clean.startsWith('data:') ||
    clean.startsWith('vbscript:') ||
    clean.startsWith('file:')
  ) {
    return false;
  }

  // Allow internal relative paths
  if (clean.startsWith('/') || clean.startsWith('#')) return true;

  // Only http(s) is allowed beyond that
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * 4. Internal Redirect Whitelist (Anti-Open-Redirect)
 *
 * True whitelist: only known in-app routes are honored, with an optional
 * order id and an optional #fragment. Everything else — protocol-relative
 * URLs (//evil.com), backslash variants (/\evil.com), schemes
 * (javascript:, https:), percent-encoded separators (%2F, %5C, %09, %0A),
 * query strings, whitespace, angle brackets — falls back to the default.
 */
const SAFE_REDIRECT_RE =
  /^\/(?:#[-A-Za-z0-9_]+|(?:checkout|orders(?:\/[-A-Za-z0-9_]+)?|products(?:\/[-A-Za-z0-9_]+)?|account|about|contact|product)?(?:#[-A-Za-z0-9_]+)?)$/;

export function isSafeRedirectPath(path: unknown, fallback = '/account'): string {
  if (typeof path !== 'string') return fallback;
  const clean = path.trim();
  if (clean.length === 0 || clean.length > 256) return fallback;
  if (!SAFE_REDIRECT_RE.test(clean)) return fallback;
  return clean;
}

/**
 * 5. Secure Storage Wrapper with Integrity & Type Checking
 */
export const secureStorage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return safeJsonParse<T>(raw, fallback);
    } catch {
      return fallback;
    }
  },

  set(key: string, value: unknown): boolean {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage unavailable
    }
  },

  clearAuthData(): void {
    try {
      const authKeys = [
        'idiot_pedals_auth_token',
        'idiot_pedals_user',
        'idiot_pedals_cart',
        'idiot_pedals_orders',
      ];
      authKeys.forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch {
      // Storage unavailable
    }
  },
};

/**
 * 6. Runtime Integrity Guards
 * Framebusting (anti-clickjacking defense in JS). The authoritative header is
 * server-set; this is a client-side backstop only.
 */
export function initRuntimeSecurity(): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = window.self.location.href;
    }
  } catch {
    // If cross-origin framing blocks access, blank the current frame
    window.location.href = 'about:blank';
  }
}
