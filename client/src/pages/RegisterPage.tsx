import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, User, Mail, Phone, Lock, AlertCircle, MapPin, CheckCircle2 } from 'lucide-react';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { describeApiError } from '../lib/api';
import { sanitizeString } from '../lib/security';
import type { UserAddress } from '../types';

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Address (matches the backend's `addresses[]` object)
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const validate = (): string | null => {
    const cleanName = sanitizeString(name);
    if (cleanName.length < 2 || cleanName.length > 50) return 'Name must be between 2 and 50 characters.';
    if (!NAME_RE.test(cleanName)) return 'Name contains invalid characters.';

    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';

    const digits = phone.replace(/\D/g, '');
    if (!PHONE_RE.test(digits)) return 'Enter a valid 10-digit Indian phone number (starting 6–9).';

    if (password.length < 8 || password.length > 128) return 'Password must be between 8 and 128 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';

    if (!sanitizeString(addressLine1)) return 'Address line 1 is required.';
    if (!sanitizeString(city)) return 'City is required.';
    if (!sanitizeString(state)) return 'State is required.';
    if (postalCode.replace(/\D/g, '').length !== 6) return 'Please enter a valid 6-digit PIN code.';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const cleanName = sanitizeString(name);
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10);

    const address: UserAddress = {
      label: 'Home',
      name: cleanName,
      phone: cleanPhone,
      addressLine1: sanitizeString(addressLine1),
      addressLine2: sanitizeString(addressLine2) || undefined,
      city: sanitizeString(city),
      state: sanitizeString(state),
      postalCode: postalCode.replace(/\D/g, '').slice(0, 6),
      country: 'India',
      isDefault: true,
    };

    try {
      const result = await register({
        name: cleanName,
        email: email.trim(),
        phone: cleanPhone,
        password,
        addresses: [address],
      });

      showToast('Registration started! Check your inbox to verify.');
      setSubmittedEmail(result.email);
    } catch (err: unknown) {
      const msg = describeApiError(err);
      setError(msg);
      showToast(msg, 'error');
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Success state: account is created only after email verification         */
  /* ---------------------------------------------------------------------- */

  if (submittedEmail) {
    return (
      <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

        <div className="max-w-md w-full mx-auto bg-white border border-[#F0D3B8] rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center backdrop-blur-xl relative z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
            <Mail size={24} />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-editorial font-normal uppercase text-[#2A1A12]">Verify Your Email</h2>
            <p className="text-xs text-[#8A6A54] font-mono-tech leading-relaxed">
              We sent a verification link to{' '}
              <span className="text-[#2A1A12] font-medium">{submittedEmail}</span>. Click it to create your
              workbench account.
            </p>
          </div>

          <div className="p-4 bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl text-left text-[11px] font-mono-tech text-[#8A6A54] space-y-1.5">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-[#FF5E1E] mt-0.5 shrink-0" />
              <span>The link expires soon and can only be used once.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-[#FF5E1E] mt-0.5 shrink-0" />
              <span>Can't find it? Check your spam or promotions folder.</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 transition-all cursor-pointer"
          >
            <span>Go To Sign In</span>
            <ArrowRight size={14} />
          </button>

          <div className="text-center text-xs font-mono-tech text-[#8A6A54]">
            Wrong email?{' '}
            <button
              type="button"
              onClick={() => setSubmittedEmail(null)}
              className="text-[#FF5E1E] font-bold hover:underline cursor-pointer"
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Form                                                                    */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-xl w-full mx-auto space-y-8 relative z-10">
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
            {/* Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={50}
                  placeholder="e.g. Rahul Das"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
                <User size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={254}
                    placeholder="rahul@guitarist.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-3.5 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                  <Mail size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Mobile (10-digit) *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-3.5 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                  <Phone size={15} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
                </div>
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
                    autoComplete="new-password"
                    maxLength={128}
                    placeholder="Min 8 characters"
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
                    autoComplete="new-password"
                    maxLength={128}
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full pl-10 pr-3.5 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                  <Lock size={14} className="absolute left-3.5 top-3.5 text-[#8A6A54]" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="pt-3 mt-1 border-t border-[#F0D3B8] space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider text-[#2A1A12] font-bold pt-2">
                <MapPin size={14} className="text-[#FF5E1E]" />
                <span>Shipping Address (India)</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Flat, House, Building, Street"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Address Line 2 (optional)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  placeholder="Landmark, Area, Sector"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all cursor-pointer"
            >
              <span>Complete Registration</span>
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
