import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/common/AsyncState';

/** Shown to the user when the session could not be established. */
const FAILURE_ERROR_CODE = 'google_failed';

/**
 * Landing page for the Google OAuth redirect.
 *
 * The backend completes the handshake and sets the httpOnly refresh cookie, then
 * 302s here — no token is ever placed in the URL. This page therefore does not
 * read credentials from the query string; it asks the API who the session
 * belongs to.
 *
 * `refreshUser()` calls GET /api/auth/me, which finds no access token and
 * transparently exchanges the refresh cookie for one (single-flight silent
 * refresh inside the API client), then retries. So one call both establishes the
 * session and loads the profile.
 *
 * StrictMode safety: the effect must NOT guard itself with a "already ran" ref.
 * Under React 18 StrictMode the first run is unmounted immediately (its cleanup
 * fires) and the second run has to do the work — a ref that makes it exit early
 * leaves the page loading forever, which is exactly what used to happen here.
 * Instead the effect is idempotent and its cleanup only stops this particular run
 * from touching state after it is gone.
 */
export const AuthCallbackPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Establishes the session, retrying once.
     *
     * A first /me 401 right after a cross-site redirect is not final: the cookie
     * the backend just set may not be usable for a moment (and on the very first
     * pass the API client may still be doing its silent refresh). Retrying keeps
     * that transient case from looking like a failed sign-in. `refreshUser()` is
     * idempotent, so calling it twice is safe.
     */
    const establishSession = async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (controller.signal.aborted) return null;

        const user = await refreshUser();
        if (user) return user;

        if (attempt === 0) await wait(400);
      }

      return null;
    };

    const settleWithFailure = () => {
      if (controller.signal.aborted) return;

      setFailed(true);
      // Hand the user back to sign-in with a reason the login page understands.
      navigate(`/login?error=${FAILURE_ERROR_CODE}`, { replace: true });
    };

    void (async () => {
      try {
        const user = await establishSession();

        if (controller.signal.aborted) return;

        if (user) {
          navigate('/account', { replace: true });
          return;
        }

        settleWithFailure();
      } catch {
        settleWithFailure();
      } finally {
        // Loading always ends, whichever way this went.
        if (!controller.signal.aborted) setSettled(true);
      }
    })();

    return () => controller.abort();
  }, [navigate, refreshUser]);

  // Keep showing the spinner only until the effect settles (success navigates away).
  if (!settled) {
    return (
      <LoadingState
        title="Signing you in"
        description="Completing the Google sign-in and loading your account."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-white">Sign-in could not be completed</h1>
      <p className="text-sm text-neutral-400">
        Google signed you in, but we could not start a session. This usually means the
        sign-in link was already used, has expired, or cookies are blocked for this site.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/login"
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
        >
          Back to sign in
        </Link>
        <Link
          to="/register"
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default AuthCallbackPage;
