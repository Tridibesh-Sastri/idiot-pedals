import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Package, LogOut, CheckCircle2, ArrowRight, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingState } from '../components/common/AsyncState';
import { userService } from '../services/userService';
import { describeApiError } from '../lib/api';

/** Mirrors the server-side rules for PATCH /api/users/me. */
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const PHONE_LENGTH = 10;

export const AccountPage: React.FC = () => {
  const { user, logout, isAuthenticated, initializing, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [profileError, setProfileError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<{ name?: string; phone?: string }>({});

  // Seed the form from the loaded profile, and re-seed whenever it changes
  // (for example after a successful save).
  React.useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
  }, [user]);

  const validateProfile = () => {
    const errors: { name?: string; phone?: string } = {};
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < NAME_MIN_LENGTH || trimmedName.length > NAME_MAX_LENGTH) {
      errors.name = `Name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters.`;
    }

    // The phone is optional, but a supplied value must be a 10-digit number.
    if (trimmedPhone.length > 0 && !/^\d{10}$/.test(trimmedPhone)) {
      errors.phone = `Phone must be exactly ${PHONE_LENGTH} digits.`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError('');

    if (!validateProfile()) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const unchanged =
      trimmedName === (user?.name ?? '') && trimmedPhone === (user?.phone ?? '');

    if (unchanged) {
      showToast('No changes to save.', 'info');
      return;
    }

    setSaving(true);

    try {
      await userService.updateProfile({ name: trimmedName, phone: trimmedPhone });
      // Re-read from the server so the header and this page show canonical data.
      await refreshUser();
      showToast('Profile updated.');
    } catch (error) {
      const message = describeApiError(error);
      setProfileError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Signed out of workbench profile.');
    } catch {
      // logout() always purges local state, so this is informational only.
      showToast('Signed out locally.', 'info');
    } finally {
      navigate('/');
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 px-4">
        <div className="max-w-md mx-auto">
          <LoadingState message="Restoring your session…" />
        </div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-[80vh] bg-[#FFF8F1] text-[#2A1A12] flex flex-col items-center justify-center px-4 pt-28">
        <div className="max-w-md w-full bg-white border border-[#F0D3B8] rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <h2 className="text-2xl font-editorial font-bold text-[#2A1A12]">
            Player Account Sign In
          </h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            Please sign in to access your order tracking and workbench settings.
          </p>
          <Link
            to="/login"
            state={{ from: '/account' }}
            className="inline-block px-7 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25"
          >
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 min-h-screen relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">

        {/* Header */}
        <div className="border-b border-[#F0D3B8] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-editorial font-normal uppercase text-[#2A1A12]">
              Workbench Player Profile
            </h1>
            <p className="text-xs text-[#8A6A54] font-mono-tech">
              Manage contact details, warranty certificates, and shipment updates.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFF1E6] hover:bg-[#FFE8D3] border border-[#F0D3B8] text-xs font-mono-tech uppercase text-[#8A6A54] hover:text-[#FF5E1E] rounded-full self-start sm:self-auto transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-[#F0D3B8]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-xl font-editorial font-bold text-[#2A1A12]">{user.name}</h2>
                <span className="text-xs font-mono-tech text-[#8A6A54]">
                  IDIOT Pedals Community Member
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-tech">
            <div className="p-5 bg-[#FFF1E6] rounded-2xl border border-[#F0D3B8] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase text-[#8A6A54]">
                  Email Address
                </span>
                {user.isEmailVerified ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={12} /> Verified
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold text-[11px]">Unverified</span>
                )}
              </div>
              <div className="text-sm font-bold text-[#2A1A12] break-all">{user.email}</div>
            </div>

            <div className="p-5 bg-[#FFF1E6] rounded-2xl border border-[#F0D3B8] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase text-[#8A6A54]">
                  Phone (Courier SMS)
                </span>
                <span className="text-[11px] text-[#8A6A54]">
                  {user.isPhoneVerified ? 'Verified' : 'Verification soon'}
                </span>
              </div>
              <div className="text-sm font-bold text-[#2A1A12]">{user.phone || 'Not set'}</div>
            </div>
          </div>

          {/* Addresses (read-only) */}
          {user.addresses.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#2A1A12] font-bold">
                Saved Addresses
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-tech text-[#8A6A54]">
                {user.addresses.map((address, index) => (
                  <div
                    key={address.id ?? `${address.addressLine1}-${index}`}
                    className="p-4 bg-[#FFF1E6] rounded-2xl border border-[#F0D3B8] space-y-1"
                  >
                    <div className="text-[11px] uppercase text-[#FF5E1E] font-bold">
                      {address.label || 'Address'}
                    </div>
                    <div className="font-bold text-[#2A1A12]">{address.name}</div>
                    <div>{address.addressLine1}</div>
                    {address.addressLine2 && <div>{address.addressLine2}</div>}
                    <div>
                      {address.city}, {address.state} - {address.postalCode}
                    </div>
                    <div>{address.country}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleProfileSave}
            className="p-5 bg-white border border-[#F0D3B8] rounded-2xl space-y-4 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <User size={16} className="text-[#FF5E1E]" />
              <h3 className="text-sm font-bold font-mono-tech uppercase tracking-wide text-[#2A1A12]">
                Edit profile
              </h3>
            </div>

            {profileError && (
              <div className="p-3 bg-red-50 border border-red-500/40 rounded-xl text-xs text-[#2A1A12]">
                {profileError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="block text-[11px] uppercase font-bold text-[#8A6A54]">
                Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={saving}
                autoComplete="name"
                className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-[#FF5E1E]">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-phone" className="block text-[11px] uppercase font-bold text-[#8A6A54]">
                Phone
              </label>
              <input
                id="profile-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, PHONE_LENGTH))}
                disabled={saving}
                autoComplete="tel"
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
              />
              {fieldErrors.phone && (
                <p className="text-[11px] text-[#FF5E1E]">{fieldErrors.phone}</p>
              )}
              <p className="text-[11px] text-[#8A6A54]">
                Email is fixed to your verified address and cannot be changed here.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF5E1E] text-white rounded-xl text-sm font-bold disabled:opacity-60 transition hover:bg-[#FF4500]"
            >
              <Save size={15} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Quick Links Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/orders"
            className="p-6 bg-white border border-[#F0D3B8] rounded-3xl hover:border-[#FF5E1E]/50 transition-all flex items-center justify-between group shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
                <Package size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#2A1A12] font-mono-tech">Shipments & Orders</div>
                <div className="text-xs text-[#8A6A54]">Track live delivery status</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#8A6A54] group-hover:text-[#FF5E1E] transition-colors" />
          </Link>

          <Link
            to="/contact"
            className="p-6 bg-white border border-[#F0D3B8] rounded-3xl hover:border-[#FF5E1E]/50 transition-all flex items-center justify-between group shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#2A1A12] font-mono-tech">Warranty & Tech Help</div>
                <div className="text-xs text-[#8A6A54]">Direct workbench tickets</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#8A6A54] group-hover:text-[#FF5E1E] transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};
