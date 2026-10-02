import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock, Mail, AlertCircle, Clock } from 'lucide-react';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isSafeRedirectPath } from '../lib/security';
import { describeApiError } from '../lib/api';

export const LoginPage: React.FC = () => {
  const { login, redirectToGoogle, isAuthenticated, loading, clearError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const sessionExpired = searchParams.get('reason') === 'session_expired';

  /*
   * The backend redirects failed Google sign-ins here as
   * /login?error=<code>. Each code gets its own message so the user learns what
   * actually happened instead of a generic failure.
   */
  const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
    google_cancelled: 'Google sign-in was cancelled before it finished.',
    google_state_invalid:
      'That sign-in attempt could not be verified. Please start again from this page.',
    google_exchange_failed:
      'Google accepted the sign-in but we could not complete it. Please try again.',
    google_account_unverified:
      'Your Google account email is not verified, so we cannot use it to sign in.',
    google_link_conflict:
      'This email already has an account that cannot be linked to Google. Sign in with your password instead.',
    google_failed: 'Google sign-in failed. Please try again.',
  };

  const googleErrorCode = searchParams.get('error') ?? '';
  const googleError = googleErrorCode
    ? GOOGLE_ERROR_MESSAGES[googleErrorCode] ??
      'Google sign-in failed. Please try again.'
    : '';

  // Open-redirect guard: only internal in-app paths are honored after login
  const redirectPath = isSafeRedirectPath((location.state as { from?: string })?.from, '/account');

  // Already signed in? Skip the form.
  useEffect(() => {
    if (isAuthenticated) navigate(redirectPath, { replace: true });
  }, [isAuthenticated, navigate, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearError();

    try {
      await login({ email, password });
      showToast('Welcome back to the workbench!');
      navigate(redirectPath);
    } catch (err: unknown) {
      const msg = describeApiError(err);
      setError(msg);
      showToast(msg, 'error');
    }
  };

  const handleGoogle = () => {
    setError('');
    try {
      redirectToGoogle();
    } catch {
      setError('Could not start Google sign-in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <IdiotPedalsLogo variant="light" size="md" />
          </Link>
          <h2 className="text-3xl font-editorial font-normal uppercase tracking-tight text-[#2A1A12]">
            Player Login
          </h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            Access your order tracking, bench warranty, and workbench receipts.
          </p>
        </div>

        <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          {sessionExpired && (
            <div className="p-3.5 bg-amber-50 border border-amber-500/40 rounded-xl text-xs text-[#2A1A12] flex items-center gap-2 font-mono-tech">
              <Clock size={15} className="text-amber-600 shrink-0" />
              <span>Your session expired for security. Please sign in again.</span>
            </div>
          )}

          {googleError && (
            <div className="p-3.5 bg-red-50 border border-red-500/40 rounded-xl text-xs text-[#2A1A12] flex items-center gap-2 font-mono-tech">
              <AlertCircle size={15} className="text-[#FF5E1E] shrink-0" />
              <span>{googleError}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-red-50 border border-red-500/40 rounded-xl text-xs text-[#2A1A12] flex items-center gap-2 font-mono-tech">
              <AlertCircle size={15} className="text-[#FF5E1E] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  placeholder="you@guitarist.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <Mail size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider">
                  Password
                </label>
                <span className="text-[11px] font-mono-tech text-[#8A6A54]">Password reset coming soon</span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <Lock size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In To Workbench'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#F0D3B8]" />
            <span className="flex-shrink mx-3 text-[11px] text-[#8A6A54] font-mono-tech uppercase">
              Or
            </span>
            <div className="flex-grow border-t border-[#F0D3B8]" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-colors text-[#2A1A12] cursor-pointer disabled:opacity-50"
          >
            <span>Continue with Google</span>
          </button>

          <div className="text-center pt-2 text-xs font-mono-tech text-[#8A6A54]">
            Don't have a workbench account yet?{' '}
            <Link to="/register" className="text-[#FF5E1E] font-bold hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
