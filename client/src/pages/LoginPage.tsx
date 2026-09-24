import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Lock, Mail, AlertCircle, Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-[#0B0B0A] text-[#F3EFE6] flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <IdiotPedalsLogo variant="dark" size="md" />
          </Link>
          <h2 className="text-2xl font-cinzel font-black uppercase tracking-tight text-[#F3EFE6]">
            Player Login
          </h2>
          <p className="text-xs text-[#8C857A]">
            Access your order tracking, bench warranty, and workbench receipts.
          </p>
        </div>

        <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3 bg-red-950/40 border border-[#D91E18] rounded text-xs text-[#F3EFE6] flex items-center gap-2">
              <AlertCircle size={14} className="text-[#D91E18] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
                <Mail size={15} className="absolute left-3 top-3 text-[#8C857A]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono-tech uppercase text-[#8C857A]">
                  Password
                </label>
                <a href="#reset" className="text-[11px] text-[#D91E18] hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
                <Lock size={15} className="absolute left-3 top-3 text-[#8C857A]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-mono-tech font-bold uppercase rounded flex items-center justify-center gap-2 shadow-lg shadow-[#D91E18]/25 transition-colors"
            >
              {loading ? 'Authenticating...' : 'Sign In To Workbench'}
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#8C857A]/20" />
            <span className="flex-shrink mx-3 text-[11px] text-[#8C857A] font-mono-tech uppercase">
              Or
            </span>
            <div className="flex-grow border-t border-[#8C857A]/20" />
          </div>

          <button
            type="button"
            onClick={handleGoogleMock}
            disabled={loading}
            className="w-full py-3 bg-[#0B0B0A] hover:bg-[#171513] border border-[#8C857A]/30 text-xs font-mono-tech font-bold uppercase rounded flex items-center justify-center gap-2 transition-colors text-[#F3EFE6]"
          >
            <span>Continue with Google</span>
          </button>

          <div className="text-center pt-2 text-xs text-[#8C857A]">
            Don't have a workbench account yet?{' '}
            <Link to="/register" className="text-[#D91E18] font-bold hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
