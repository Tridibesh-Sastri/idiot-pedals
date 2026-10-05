import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Package, LogOut, CheckCircle2, ArrowRight, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoadingState } from '../components/common/AsyncState';
import { userService } from '../services/userService';
import { describeApiError } from '../lib/api';
import { isValidPhone, validateContactFields, PROFILE_CONTACT_CAPS } from '../lib/validation';
import type { UserAddress } from '../types';

/** Mirrors the server-side rules for PATCH /api/users/me. */
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 50;
const PHONE_LENGTH = 10;
const MAX_ADDRESSES = 20;

interface AddressDraft {
  label: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

const blankAddressDraft = (fallbackName: string): AddressDraft => ({
  label: 'Home',
  name: fallbackName,
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  isDefault: false,
});

const draftFromAddress = (address: UserAddress): AddressDraft => ({
  label: address.label ?? 'Home',
  name: address.name ?? '',
  phone: address.phone ?? '',
  addressLine1: address.addressLine1 ?? '',
  addressLine2: address.addressLine2 ?? '',
  city: address.city ?? '',
  state: address.state ?? '',
  postalCode: address.postalCode ?? '',
  country: address.country ?? 'India',
  isDefault: address.isDefault ?? false,
});

export const AccountPage: React.FC = () => {
  const { user, logout, isAuthenticated, initializing, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [profileError, setProfileError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<{ name?: string; phone?: string }>({});
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [draft, setDraft] = React.useState<AddressDraft>(() => blankAddressDraft(''));
  const [addrSaving, setAddrSaving] = React.useState(false);
  const [addrError, setAddrError] = React.useState('');
  const [addrFieldErrors, setAddrFieldErrors] = React.useState<Record<string, string>>({});

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

    // The phone is optional, but a supplied value must pass the shared rule.
    if (trimmedPhone.length > 0 && !isValidPhone(trimmedPhone)) {
      errors.phone = 'Enter a valid 10-digit Indian phone number.';
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

  const validateAddressDraft = (candidate: AddressDraft): Record<string, string> =>
    validateContactFields(
      {
        name: candidate.name,
        phone: candidate.phone,
        addressLine1: candidate.addressLine1,
        city: candidate.city,
        state: candidate.state,
        postalCode: candidate.postalCode,
      },
      PROFILE_CONTACT_CAPS
    );

  const persistAddresses = async (addresses: UserAddress[], successCopy: string) => {
    setAddrSaving(true);
    setAddrError('');
    try {
      await userService.updateProfile({ addresses });
      await refreshUser();
      showToast(successCopy);
      setEditingIndex(null);
      setShowAddForm(false);
    } catch (error) {
      const message = describeApiError(error);
      setAddrError(message);
      showToast(message, 'error');
    } finally {
      setAddrSaving(false);
    }
  };

  const openAddForm = () => {
    setDraft(blankAddressDraft(user?.name ?? ''));
    setAddrFieldErrors({});
    setAddrError('');
    setEditingIndex(null);
    setShowAddForm(true);
  };

  const openEditForm = (index: number) => {
    setDraft(draftFromAddress(safeAddresses[index]));
    setAddrFieldErrors({});
    setAddrError('');
    setShowAddForm(false);
    setEditingIndex(index);
  };

  const handleAddressSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateAddressDraft(draft);
    setAddrFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const entry: UserAddress = {
      label: draft.label.trim() || 'Home',
      name: draft.name.trim(),
      phone: draft.phone.replace(/[\s-]/g, ''),
      addressLine1: draft.addressLine1.trim(),
      addressLine2: draft.addressLine2.trim() || undefined,
      city: draft.city.trim(),
      state: draft.state.trim(),
      postalCode: draft.postalCode.replace(/\D/g, ''),
      country: draft.country.trim() || 'India',
      isDefault: draft.isDefault,
    };

    const current = safeAddresses;
    const next =
      editingIndex === null ? [...current, entry] : current.map((item, i) => (i === editingIndex ? entry : item));
    await persistAddresses(next, editingIndex === null ? 'Address added.' : 'Address updated.');
  };

  const handleAddressDelete = async (index: number) => {
    await persistAddresses(
      safeAddresses.filter((_, i) => i !== index),
      'Address deleted.'
    );
  };

  const handleSetDefault = async (index: number) => {
    await persistAddresses(
      safeAddresses.map((item, i) => ({ ...item, isDefault: i === index })),
      'Default address updated.'
    );
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

  // Null-safe view of the address list: the type promises an array, but any
  // un-normalised shape must render empty instead of throwing.
  const safeAddresses = Array.isArray(user.addresses)
    ? user.addresses.filter((entry) => !!entry)
    : [];

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

          {/* Saved addresses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#2A1A12] font-bold">
                Saved Addresses
              </h3>
              {safeAddresses.length < MAX_ADDRESSES && !showAddForm && editingIndex === null && (
                <button
                  type="button"
                  onClick={openAddForm}
                  disabled={addrSaving}
                  className="px-4 py-2 bg-[#FFF1E6] border border-[#F0D3B8] text-[11px] font-mono-tech font-bold uppercase rounded-full text-[#2A1A12] hover:border-[#FF5E1E] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  + Add address
                </button>
              )}
            </div>

            {addrError && (
              <div className="p-3 bg-red-50 border border-red-500/40 rounded-xl text-xs text-[#2A1A12]">
                {addrError}
              </div>
            )}

            {safeAddresses.length === 0 && !showAddForm && (
              <p className="text-xs text-[#8A6A54] font-mono-tech">
                No saved addresses yet. Add one and checkout will reuse it.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-tech text-[#8A6A54]">
              {safeAddresses.map((address, index) => (
                <div
                  key={address.id ?? `${address.addressLine1}-${index}`}
                  className="p-4 bg-[#FFF1E6] rounded-2xl border border-[#F0D3B8] space-y-1"
                >
                  <div className="text-[11px] uppercase text-[#FF5E1E] font-bold flex items-center justify-between">
                    <span>{address.label || 'Address'}</span>
                    {address.isDefault && (
                      <span className="px-2 py-0.5 bg-[#FF5E1E]/15 text-[#FF5E1E] rounded-full">Default</span>
                    )}
                  </div>
                  <div className="font-bold text-[#2A1A12]">{address.name}</div>
                  <div>{address.addressLine1}</div>
                  {address.addressLine2 && <div>{address.addressLine2}</div>}
                  <div>
                    {address.city}, {address.state} - {address.postalCode}
                  </div>
                  <div>{address.country}</div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => openEditForm(index)}
                      disabled={addrSaving}
                      className="px-3 py-1.5 bg-white border border-[#F0D3B8] rounded-full text-[11px] font-bold uppercase text-[#2A1A12] hover:border-[#FF5E1E] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddressDelete(index)}
                      disabled={addrSaving}
                      className="px-3 py-1.5 bg-white border border-[#F0D3B8] rounded-full text-[11px] font-bold uppercase text-[#2A1A12] hover:border-[#FF5E1E] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Delete
                    </button>
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(index)}
                        disabled={addrSaving}
                        className="px-3 py-1.5 bg-white border border-[#F0D3B8] rounded-full text-[11px] font-bold uppercase text-[#2A1A12] hover:border-[#FF5E1E] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Set default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {(showAddForm || editingIndex !== null) && (
              <form
                onSubmit={handleAddressSave}
                className="p-5 bg-white border border-[#F0D3B8] rounded-2xl space-y-4 shadow-xl"
              >
                <h4 className="text-sm font-bold font-mono-tech uppercase tracking-wide text-[#2A1A12]">
                  {editingIndex === null ? 'Add address' : 'Edit address'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">Label</label>
                    <input
                      type="text"
                      value={draft.label}
                      onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                      disabled={addrSaving}
                      placeholder="Home"
                      className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">Full name *</label>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      disabled={addrSaving}
                      className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                    />
                    {addrFieldErrors.name && <p className="text-[11px] text-[#FF5E1E]">{addrFieldErrors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">Phone *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={draft.phone}
                      onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                      disabled={addrSaving}
                      placeholder="10-digit mobile number"
                      className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                    />
                    {addrFieldErrors.phone && <p className="text-[11px] text-[#FF5E1E]">{addrFieldErrors.phone}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">PIN code *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={draft.postalCode}
                      onChange={(event) => setDraft({ ...draft, postalCode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                      disabled={addrSaving}
                      className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                    />
                    {addrFieldErrors.postalCode && (
                      <p className="text-[11px] text-[#FF5E1E]">{addrFieldErrors.postalCode}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">Address line 1 *</label>
                  <input
                    type="text"
                    value={draft.addressLine1}
                    onChange={(event) => setDraft({ ...draft, addressLine1: event.target.value })}
                    disabled={addrSaving}
                    className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                  />
                  {addrFieldErrors.addressLine1 && (
                    <p className="text-[11px] text-[#FF5E1E]">{addrFieldErrors.addressLine1}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">Address line 2</label>
                  <input
                    type="text"
                    value={draft.addressLine2}
                    onChange={(event) => setDraft({ ...draft, addressLine2: event.target.value })}
                    disabled={addrSaving}
                    className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">City *</label>
                    <input
                      type="text"
                      value={draft.city}
                      onChange={(event) => setDraft({ ...draft, city: event.target.value })}
                      disabled={addrSaving}
                      className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                    />
                    {addrFieldErrors.city && <p className="text-[11px] text-[#FF5E1E]">{addrFieldErrors.city}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">State *</label>
                    <input
                      type="text"
                      value={draft.state}
                      onChange={(event) => setDraft({ ...draft, state: event.target.value })}
                      disabled={addrSaving}
                      className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                    />
                    {addrFieldErrors.state && <p className="text-[11px] text-[#FF5E1E]">{addrFieldErrors.state}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase font-bold text-[#8A6A54]">Country</label>
                    <input
                      type="text"
                      value={draft.country}
                      onChange={(event) => setDraft({ ...draft, country: event.target.value })}
                      disabled={addrSaving}
                      className="w-full px-3.5 py-2.5 bg-[#FFF8F1] border border-[#F0D3B8] rounded-xl text-sm text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E] disabled:opacity-60"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-mono-tech text-[#8A6A54] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.isDefault}
                    onChange={(event) => setDraft({ ...draft, isDefault: event.target.checked })}
                    disabled={addrSaving}
                  />
                  Set as default address
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addrSaving}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF5E1E] text-white rounded-xl text-sm font-bold disabled:opacity-60 transition hover:bg-[#FF4500] cursor-pointer"
                  >
                    <Save size={15} />
                    {addrSaving ? 'Saving…' : 'Save address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingIndex(null);
                      setAddrError('');
                      setAddrFieldErrors({});
                    }}
                    disabled={addrSaving}
                    className="px-4 py-2.5 bg-white border border-[#F0D3B8] rounded-xl text-sm font-bold text-[#2A1A12] disabled:opacity-60 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

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
                <div className="text-xs text-[#8A6A54]">View your orders and their status</div>
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
