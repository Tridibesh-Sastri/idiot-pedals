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
    <div className="min-h-screen bg-[#0B0B0A] text-[#F3EFE6] flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-block">
            <IdiotPedalsLogo variant="dark" size="md" />
          </Link>
          <h2 className="text-2xl font-cinzel font-black uppercase tracking-tight text-[#F3EFE6]">
            Join The Workbench
          </h2>
          <p className="text-xs text-[#8C857A]">
            Create a player profile to receive direct batch notices and track shipments.
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
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Das"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
                <User size={15} className="absolute left-3 top-3 text-[#8C857A]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="rahul@guitarist.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
                <Mail size={15} className="absolute left-3 top-3 text-[#8C857A]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                Mobile Number (for SMS Tracking)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
                <Phone size={15} className="absolute left-3 top-3 text-[#8C857A]" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-[#8C857A]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                  Confirm *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Repeat"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                  />
                  <Lock size={14} className="absolute left-3 top-3 text-[#8C857A]" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-mono-tech font-bold uppercase rounded flex items-center justify-center gap-2 shadow-lg shadow-[#D91E18]/25 transition-colors pt-3"
            >
              {loading ? 'Creating Profile...' : 'Complete Registration'}
              <ArrowRight size={14} />
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-[#8C857A]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#D91E18] font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
