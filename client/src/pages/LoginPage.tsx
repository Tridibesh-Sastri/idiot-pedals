import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginPage: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('arjun.sen@guitarist.in');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectPath = (location.state as { from?: string })?.from || '/account';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      showToast('Welcome back to the workbench!');
      navigate(redirectPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid login credentials.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMock = async () => {
    setLoading(true);
    try {
      await googleLogin();
      showToast('Signed in via Google successfully.');
      navigate(redirectPath);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F6F4EE] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <IdiotPedalsLogo variant="dark" size="md" />
          </Link>
          <h2 className="text-3xl font-editorial font-normal uppercase tracking-tight text-[#F6F4EE]">
            Player Login
          </h2>
          <p className="text-xs text-[#8E98A8] font-mono-tech">
            Access your order tracking, bench warranty, and workbench receipts.
          </p>
        </div>

        <div className="bg-[#121722]/80 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-[#F6F4EE] flex items-center gap-2 font-mono-tech">
              <AlertCircle size={15} className="text-[#FF5E1E] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8E98A8] tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-white/15 rounded-full pl-10 pr-4 py-3 text-xs text-[#F6F4EE] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <Mail size={15} className="absolute left-3.5 top-3.5 text-[#8E98A8]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono-tech uppercase text-[#8E98A8] tracking-wider">
                  Password
                </label>
                <a href="#reset" className="text-[11px] font-mono-tech text-[#FF5E1E] hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-white/15 rounded-full pl-10 pr-4 py-3 text-xs text-[#F6F4EE] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <Lock size={15} className="absolute left-3.5 top-3.5 text-[#8E98A8]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In To Workbench'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink mx-3 text-[11px] text-[#8E98A8] font-mono-tech uppercase">
              Or
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleMock}
            disabled={loading}
            className="w-full py-3.5 bg-[#0B0E14] hover:bg-[#161C28] border border-white/15 text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 transition-colors text-[#F6F4EE] cursor-pointer"
          >
            <span>Continue with Google</span>
          </button>

          <div className="text-center pt-2 text-xs font-mono-tech text-[#8E98A8]">
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
