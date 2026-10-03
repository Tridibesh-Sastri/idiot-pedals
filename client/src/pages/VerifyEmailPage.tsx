import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, MailCheck, MailX, Clock, AlertCircle, ArrowRight, Loader2, Send } from 'lucide-react';
import { authService, EmailVerificationOutcome } from '../services/authService';
import { describeApiError } from '../lib/api';
import {
  ViewState,
  verifyCopyFor,
  resendCountdownLabel,
} from '../lib/verifyHelpers';

export type { ViewState };
export { verifyCopyFor, resendCountdownLabel };

/**
 * Landing page for the link sent by POST /api/auth/register.
 * The backend emails `${FRONTEND_URL}/verify-email?token=...`.
 *
 * POST-with-button contract: landing here consumes NOTHING. Exactly one
 * POST goes out per button press (busy-guarded, button disabled in flight),
 * so scanners, prefetchers and StrictMode cannot burn the single-use token.
 * Distinct states: valid / expired / already-verified / invalid / missing token.
 */

const RESEND_FALLBACK_MESSAGE =
  'If a verification email is pending for this address, a new link is on its way. Only the newest email works.';

const ResendBlock: React.FC = () => {
  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const startCountdown = (seconds: number) => {
    if (timer.current) clearInterval(timer.current);
    setCountdown(Math.max(0, Math.floor(seconds)));
    timer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || countdown > 0 || !email.trim()) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await authService.resendVerificationEmail(email.trim());
      setNotice(result.message || RESEND_FALLBACK_MESSAGE);
      startCountdown(result.retryAfterSeconds);
    } catch (err) {
      setNotice(describeApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleResend} className="space-y-2.5 pt-1">
      <input
        type="email"
        required
        maxLength={254}
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
      />
      <button
        type="submit"
        disabled={busy || countdown > 0 || !email.trim()}
        className="w-full py-3.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-colors text-[#2A1A12] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Send size={14} />
        <span>{busy ? 'Sending…' : resendCountdownLabel(countdown)}</span>
      </button>
      {notice && (
        <p className="text-[11px] text-[#8A6A54] font-mono-tech leading-relaxed">{notice}</p>
      )}
    </form>
  );
};

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [view, setView] = useState<ViewState>(token ? 'idle' : 'no_token');
  const [message, setMessage] = useState('');
  const [errorText, setErrorText] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const verify = async () => {
    // Exactly one POST per press: the ref guards re-entrancy, the disabled
    // button guards double clicks. No effect auto-fires, so StrictMode and
    // prefetchers cannot consume the token.
    if (busyRef.current || !token) return;
    busyRef.current = true;
    setBusy(true);
    setView('loading');
    setErrorText('');

    try {
      const result = await authService.verifyEmailToken(token);
      const outcome: EmailVerificationOutcome = result.outcome;
      setMessage(result.message);
      setView(outcome);
    } catch (err) {
      setErrorText(describeApiError(err));
      setView('error');
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  };

  const retry = () => {
    // Transport-level failures only (the token state is unknown, and every
    // verify outcome is safe to repeat). Never offered on settled views.
    if (busyRef.current) return;
    setErrorText('');
    setView('idle');
  };

  const copy = verifyCopyFor(view, view === 'error' ? errorText : message);

  const iconFor = (state: ViewState) => {
    switch (state) {
      case 'verified':
        return <MailCheck size={24} />;
      case 'already_verified':
        return <MailCheck size={24} />;
      case 'expired':
        return <Clock size={24} />;
      case 'invalid':
        return <MailX size={24} />;
      case 'no_token':
        return <Mail size={24} />;
      default:
        return <AlertCircle size={24} />;
    }
  };

  const toneFor = (state: ViewState) => {
    switch (state) {
      case 'verified':
      case 'already_verified':
        return 'from-emerald-500 to-emerald-600 shadow-emerald-500/30 border-emerald-500/30';
      default:
        return 'from-[#FF7A00] to-[#FF4500] shadow-[#FF5E1E]/30 border-[#FF5E1E]/30';
    }
  };

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
        ) : view === 'idle' ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
              <Mail size={24} />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-editorial font-normal uppercase text-[#2A1A12]">Verify Email</h2>
              <p className="text-xs text-[#8A6A54] font-mono-tech leading-relaxed">
                Press the button below to verify your email and create your account. Nothing
                happens until you press it, so mail scanners cannot use up your link.
              </p>
            </div>
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={verify}
                disabled={busy || !token}
                className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Verify my email</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        ) : (
          copy && (
            <>
              <div
                className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br border flex items-center justify-center text-white shadow-lg ${toneFor(view)}`}
              >
                {iconFor(view)}
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl font-editorial font-normal uppercase text-[#2A1A12]">{copy.title}</h2>
                <p className="text-xs text-[#8A6A54] font-mono-tech leading-relaxed">{copy.body}</p>
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

                {view === 'error' && (
                  <button
                    type="button"
                    onClick={retry}
                    disabled={busy}
                    className="w-full py-3.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-colors text-[#2A1A12] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Try Again</span>
                    <ArrowRight size={14} />
                  </button>
                )}

                {(view === 'expired' || view === 'invalid') && <ResendBlock />}

                {(view === 'expired' || view === 'invalid') && (
                  <>
                    <Link
                      to="/login"
                      className="block w-full py-3.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech font-bold uppercase rounded-full text-[#2A1A12] transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="block w-full py-3.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech font-bold uppercase rounded-full text-[#2A1A12] transition-colors"
                    >
                      Register Again
                    </Link>
                  </>
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
