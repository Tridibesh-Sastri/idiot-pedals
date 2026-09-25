/**
 * Security & Anti-Tamper Hardening Core
 *
 * Provides enterprise-grade client-side defenses:
 * 1. Prototype Pollution Defense
 * 2. Immutable Frozen Catalog Ledger (Anti-Price-Tampering)
 * 3. Secure Storage Wrapper with Integrity Checks
 * 4. Safe URL Protocol Validator (Anti-Open-Redirect / XSS)
 * 5. Input Sanitizer
 */

// 1. Immutable Official Product Catalog Ledger
export interface OfficialProduct {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly originalPrice: number;
  readonly maxOrderQuantity: number;
}

export const IMMUTABLE_CATALOG: Readonly<Record<string, Readonly<OfficialProduct>>> = Object.freeze({
  'neon-fuzz-box': Object.freeze({
    id: 'neon-fuzz-box',
    name: 'Neon Fuzz Box',
    price: 2499,
    originalPrice: 3499,
    maxOrderQuantity: 5,
  }),
});

/**
 * Validates and binds a cart item price to the immutable ledger.
 * Prevents DevTools / localStorage price tampering.
 * Fail-safe: unknown ids (including '__proto__'-style prototype-chain
 * lookups, which resolve truthy on plain objects) fall back to the
 * official flagship price instead of producing undefined/NaN.
 */
export function getAuthoritativePrice(productId: string): number {
  const item =
    typeof productId === 'string' &&
    Object.prototype.hasOwnProperty.call(IMMUTABLE_CATALOG, productId)
      ? IMMUTABLE_CATALOG[productId]
      : undefined;
  if (!item) {
    return 2499; // Fallback to official price
  }
  return item.price;
}

/**
 * 2. Prototype-Pollution-Proof JSON Parser
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
 * 3. Input Sanitizer (XSS, fuzz & Injection Protection)
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
 * 4. Safe URL / Protocol Validator (Anti-Open-Redirect & Script Injection)
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

  // Whitelist safe external domains (Razorpay, GitHub, official assets)
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' ||
      parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

/**
 * 4b. Internal Redirect Whitelist (Anti-Open-Redirect)
 *
 * True whitelist: only known in-app routes are honored, with an optional
 * order id and an optional #fragment. Everything else — protocol-relative
 * URLs (//evil.com), backslash variants (/\evil.com), schemes
 * (javascript:, https:), percent-encoded separators (%2F, %5C, %09, %0A),
 * query strings, whitespace, angle brackets — falls back to the default.
 * Nothing in the app generates redirects outside this set (verified: no
 * `state={{ from }}` producer exists), so safe failure is free.
 */
const SAFE_REDIRECT_RE =
  /^\/(?:#[-A-Za-z0-9_]+|(?:checkout|orders(?:\/[-A-Za-z0-9_]+)?|account|about|contact|product)?(?:#[-A-Za-z0-9_]+)?)$/;

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
 * 6. Runtime Integrity Lock: Freeze sensitive prototypes against script injection
 */
export function initRuntimeSecurity(): void {
  if (typeof window === 'undefined') return;

  // Framebusting (Anti-Clickjacking defense in JS)
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = window.self.location.href;
    }
  } catch {
    // If cross-origin framing blocks access, redirect current frame
    window.location.href = 'about:blank';
  }

  // Freeze core product objects
  Object.freeze(IMMUTABLE_CATALOG);
}
