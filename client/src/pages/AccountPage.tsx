import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Package,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Edit2,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { userService } from '../services/userService';

export const AccountPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    await logout();
    showToast('Signed out of workbench profile.');
    navigate('/');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.updateProfile({ name, phone });
      await refreshUser();
      setIsEditing(false);
      showToast('Profile information saved locally.');
    } catch {
      showToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] bg-[#0B0B0A] text-[#F3EFE6] flex flex-col items-center justify-center px-4 pt-20">
        <div className="max-w-md w-full bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <h2 className="text-xl font-bold font-cinzel text-[#F3EFE6]">
            Player Account Sign In
          </h2>
          <p className="text-xs text-[#8C857A]">
            Please sign in to access your order tracking and workbench settings.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-[#D91E18] text-white text-xs font-mono-tech font-bold uppercase rounded shadow"
          >
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0B0A] text-[#F3EFE6] pt-24 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="border-b border-[#8C857A]/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-cinzel font-black uppercase text-[#F3EFE6]">
              Workbench Player Profile
            </h1>
            <p className="text-xs text-[#8C857A]">
              Manage contact details, warranty certificates, and shipment updates.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#171513] hover:bg-[#0B0B0A] border border-[#8C857A]/30 text-xs font-mono-tech uppercase text-[#8C857A] hover:text-[#D91E18] rounded self-start sm:self-auto transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#8C857A]/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#0B0B0A] border-2 border-[#8C857A]/30 flex items-center justify-center text-[#D91E18]">
                <User size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F3EFE6]">{user.name}</h2>
                <span className="text-xs font-mono-tech text-[#8C857A]">
                  IDIOT Pedals Community Member
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 bg-[#0B0B0A] border border-[#8C857A]/30 rounded text-xs font-mono-tech uppercase text-[#F3EFE6] hover:border-[#D91E18] transition-colors flex items-center gap-1.5"
            >
              <Edit2 size={12} />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                  Phone (for SMS tracking)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-mono-tech font-bold uppercase rounded flex items-center gap-2 shadow"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#0B0B0A] rounded-xl border border-[#8C857A]/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono-tech uppercase text-[#8C857A]">
                    Email Address
                  </span>
                  {user.isEmailVerified ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : (
                    <Link
                      to="/verify-email"
                      className="text-[#D91E18] font-bold hover:underline text-[11px]"
                    >
                      Verify Now
                    </Link>
                  )}
                </div>
                <div className="text-sm font-bold text-[#F3EFE6]">{user.email}</div>
              </div>

              <div className="p-4 bg-[#0B0B0A] rounded-xl border border-[#8C857A]/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono-tech uppercase text-[#8C857A]">
                    Phone (Courier SMS)
                  </span>
                  {user.isPhoneVerified ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : (
                    <Link
                      to="/verify-phone"
                      className="text-[#D91E18] font-bold hover:underline text-[11px]"
                    >
                      Verify OTP
                    </Link>
                  )}
                </div>
                <div className="text-sm font-bold text-[#F3EFE6]">{user.phone || 'Not set'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/orders"
            className="p-6 bg-[#171513] border border-[#8C857A]/25 rounded-2xl hover:border-[#D91E18] transition-colors flex items-center justify-between group shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18]">
                <Package size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#F3EFE6]">Shipments & Orders</div>
                <div className="text-xs text-[#8C857A]">Track live delivery status</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#8C857A] group-hover:text-white transition-colors" />
          </Link>

          <Link
            to="/contact"
            className="p-6 bg-[#171513] border border-[#8C857A]/25 rounded-2xl hover:border-[#D91E18] transition-colors flex items-center justify-between group shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#F3EFE6]">Warranty & Tech Help</div>
                <div className="text-xs text-[#8C857A]">Direct workbench tickets</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#8C857A] group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};
