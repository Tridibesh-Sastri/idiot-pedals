import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, MailCheck, MailX, Clock, AlertCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { authService, EmailVerificationOutcome } from '../services/authService';
import { describeApiError } from '../lib/api';

type ViewState = 'idle' | 'loading' | 'verified' | 'already_verified' | 'expired' | 'invalid' | 'no_token' | 'error';

interface Presentation {
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  body: string;
}

/**
 * Landing page for the link sent by POST /api/auth/register.
 * The backend emails `${FRONTEND_URL}/verify-email?token=...`.
 *
 * Distinct states: valid / expired / already-verified / invalid / missing token.
 */
export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [view, setView] = useState<ViewState>(token ? 'loading' : 'no_token');
  const [message, setMessage] = useState('');
  const [errorText, setErrorText] = useState('');
  const attempted = useRef(false);

  const verify = useCallback(async (verificationToken: string) => {
    if (!verificationToken) {
      setView('no_token');
      return;
    }

    setView('loading');
    setErrorText('');

    try {
      const result = await authService.verifyEmailToken(verificationToken);
      const outcome: EmailVerificationOutcome = result.outcome;
      setMessage(result.message);
      setView(outcome);
    } catch (err) {
      setErrorText(describeApiError(err));
      setView('error');
    }
  }, []);

  useEffect(() => {
    // StrictMode double-invokes effects in dev — the token is single-use, so
    // guard against firing the verification twice.
    if (attempted.current) return;
    attempted.current = true;
    if (token) verify(token);
  }, [token, verify]);

  const presentation: Record<Exclude<ViewState, 'loading' | 'idle'>, Presentation> = {
    verified: {
      icon: <MailCheck size={24} />,
      iconTone: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30 border-emerald-500/30',
      title: 'Email Verified',
      body: message || 'Your account has been created. You can now sign in to the workbench.',
    },
    already_verified: {
      icon: <MailCheck size={24} />,
      iconTone: 'from-[#FF7A00] to-[#FF4500] shadow-[#FF5E1E]/30 border-[#FF5E1E]/30',
      title: 'Already Verified',
      body: message || 'This email address already has a verified account. Try signing in instead.',
    },
    expired: {
      icon: <Clock size={24} />,
      iconTone: 'from-amber-500 to-amber-600 shadow-amber-500/30 border-amber-500/30',
      title: 'Link Expired',
      body: message || 'This verification link has expired. Register again to receive a fresh link.',
    },
    invalid: {
      icon: <MailX size={24} />,
      iconTone: 'from-red-500 to-red-600 shadow-red-500/30 border-red-500/30',
      title: 'Invalid Link',
      body: message || 'This verification link is not valid. It may have already been used.',
    },
    no_token: {
      icon: <Mail size={24} />,
      iconTone: 'from-[#FF7A00] to-[#FF4500] shadow-[#FF5E1E]/30 border-[#FF5E1E]/30',
      title: 'Verify Email',
      body: 'Open the verification link from your registration email to activate your account.',
    },
    error: {
      icon: <AlertCircle size={24} />,
      iconTone: 'from-red-500 to-red-600 shadow-red-500/30 border-red-500/30',
      title: 'Verification Failed',
      body: errorText || 'We could not verify your email right now. Please try again.',
    },
  };

  const current = view === 'loading' || view === 'idle' ? null : presentation[view];
  const canRetry = (view === 'expired' || view === 'invalid' || view === 'error') && Boolean(token);

  return (
    <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-md w-full mx-auto bg-white border border-[#F0D3B8] rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center backdrop-blur-xl relative z-10">
        {view === 'loading' ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-editorial font-normal uppercase text-[#2A1A12]">Verifying</h2>
              <p className="text-xs text-[#8A6A54] font-mono-tech">
                Confirming your verification link...
              </p>
            </div>
          </>
        ) : (
          current && (
            <>
              <div
                className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br border flex items-center justify-center text-white shadow-lg ${current.iconTone}`}
              >
                {current.icon}
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl font-editorial font-normal uppercase text-[#2A1A12]">{current.title}</h2>
                <p className="text-xs text-[#8A6A54] font-mono-tech leading-relaxed">{current.body}</p>
              </div>

              <div className="space-y-3 pt-1">
                {(view === 'verified' || view === 'already_verified') && (
                  <Link
                    to="/login"
                    className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 transition-all"
                  >
                    <span>Sign In Now</span>
                    <ArrowRight size={14} />
                  </Link>
                )}

                {view === 'no_token' && (
                  <Link
                    to="/register"
                    className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 transition-all"
                  >
                    <span>Create An Account</span>
                    <ArrowRight size={14} />
                  </Link>
                )}

                {canRetry && (
                  <button
                    type="button"
                    onClick={() => verify(token)}
                    className="w-full py-3.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-colors text-[#2A1A12] cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Try Again</span>
                  </button>
                )}

                {(view === 'expired' || view === 'invalid') && (
                  <Link
                    to="/register"
                    className="block w-full py-3.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech font-bold uppercase rounded-full text-[#2A1A12] transition-colors"
                  >
                    Register Again
                  </Link>
                )}
              </div>
            </>
          )
        )}

        <div className="pt-1">
          <Link to="/account" className="text-xs font-mono-tech text-[#8A6A54] hover:text-[#2A1A12]">
            Go to Account
          </Link>
        </div>
      </div>
    </div>
  );
};
