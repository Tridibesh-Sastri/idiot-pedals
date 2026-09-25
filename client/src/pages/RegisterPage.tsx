import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, User, Mail, Phone, Lock, AlertCircle } from 'lucide-react';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, phone, password });
      showToast('Account created successfully! Check your phone for verification.');
      navigate('/verify-phone');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <IdiotPedalsLogo variant="light" size="md" />
          </Link>
          <h2 className="text-3xl font-editorial font-normal uppercase tracking-tight text-[#2A1A12]">
            Join The Workbench
          </h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            Create a player profile to receive direct batch notices and track shipments.
          </p>
        </div>

        <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-500/40 rounded-xl text-xs text-[#2A1A12] flex items-center gap-2 font-mono-tech">
              <AlertCircle size={15} className="text-[#FF5E1E] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Das"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <User size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="rahul@guitarist.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <Mail size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                Mobile Number (for SMS Tracking)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <Phone size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-3.5 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Confirm *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Repeat"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-3.5 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all cursor-pointer"
            >
              <span>{loading ? 'Creating Profile...' : 'Complete Registration'}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="text-center pt-2 text-xs font-mono-tech text-[#8A6A54]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FF5E1E] font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
