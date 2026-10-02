import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/common/AsyncState';

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
 */
export const AuthCallbackPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    // React 18 StrictMode runs effects twice in development; the session
    // exchange must not be attempted twice concurrently.
    if (hasRun.current) return;
    hasRun.current = true;

    let cancelled = false;

    void (async () => {
      const user = await refreshUser();

      if (cancelled) return;

      if (user) {
        navigate('/account', { replace: true });
        return;
      }

      setFailed(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshUser]);

  if (!failed) {
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
