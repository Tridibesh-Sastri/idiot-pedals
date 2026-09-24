import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Package,
  LogOut,
  CheckCircle2,
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
      <div className="min-h-[80vh] bg-[#0B0E14] text-[#F6F4EE] flex flex-col items-center justify-center px-4 pt-28">
        <div className="max-w-md w-full bg-[#121722]/80 border border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <h2 className="text-2xl font-editorial font-bold text-[#F6F4EE]">
            Player Account Sign In
          </h2>
          <p className="text-xs text-[#8E98A8] font-mono-tech">
            Please sign in to access your order tracking and workbench settings.
          </p>
          <Link
            to="/login"
            className="inline-block px-7 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25"
          >
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0E14] text-[#F6F4EE] pt-28 pb-20 min-h-screen relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-[#FF5E1E]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-white/10 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-editorial font-normal uppercase text-[#F6F4EE]">
              Workbench Player Profile
            </h1>
            <p className="text-xs text-[#8E98A8] font-mono-tech">
              Manage contact details, warranty certificates, and shipment updates.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121722] hover:bg-[#161C28] border border-white/15 text-xs font-mono-tech uppercase text-[#8E98A8] hover:text-[#FF5E1E] rounded-full self-start sm:self-auto transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-[#121722]/80 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#161C28] border border-[#FF5E1E]/30 flex items-center justify-center text-[#FF5E1E] glow-neon-subtle">
                <User size={24} />
              </div>
              <div>
                <h2 className="text-xl font-editorial font-bold text-[#F6F4EE]">{user.name}</h2>
                <span className="text-xs font-mono-tech text-[#8E98A8]">
                  IDIOT Pedals Community Member
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-[#0B0E14] border border-white/15 rounded-full text-xs font-mono-tech uppercase text-[#F6F4EE] hover:border-[#FF5E1E] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 size={12} />
              <span>{isEditing ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8E98A8] tracking-wider block">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-white/15 rounded-full px-4 py-3 text-xs text-[#F6F4EE] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8E98A8] tracking-wider block">
                  Phone (for SMS tracking)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-white/15 rounded-full px-4 py-3 text-xs text-[#F6F4EE] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center gap-2 shadow-lg shadow-[#FF5E1E]/25 transition-all cursor-pointer"
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-tech">
              <div className="p-5 bg-[#0B0E14] rounded-2xl border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase text-[#8E98A8]">
                    Email Address
                  </span>
                  {user.isEmailVerified ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : (
                    <Link
                      to="/verify-email"
                      className="text-[#FF5E1E] font-bold hover:underline text-[11px]"
                    >
                      Verify Now
                    </Link>
                  )}
                </div>
                <div className="text-sm font-bold text-[#F6F4EE]">{user.email}</div>
              </div>

              <div className="p-5 bg-[#0B0E14] rounded-2xl border border-white/10 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase text-[#8E98A8]">
                    Phone (Courier SMS)
                  </span>
                  {user.isPhoneVerified ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : (
                    <Link
                      to="/verify-phone"
                      className="text-[#FF5E1E] font-bold hover:underline text-[11px]"
                    >
                      Verify OTP
                    </Link>
                  )}
                </div>
                <div className="text-sm font-bold text-[#F6F4EE]">{user.phone || 'Not set'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/orders"
            className="p-6 bg-[#121722]/80 border border-white/10 rounded-3xl hover:border-[#FF5E1E]/50 transition-all flex items-center justify-between group shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#161C28] border border-[#FF5E1E]/30 flex items-center justify-center text-[#FF5E1E] glow-neon-subtle">
                <Package size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#F6F4EE] font-mono-tech">Shipments & Orders</div>
                <div className="text-xs text-[#8E98A8]">Track live delivery status</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#8E98A8] group-hover:text-[#FF5E1E] transition-colors" />
          </Link>

          <Link
            to="/contact"
            className="p-6 bg-[#121722]/80 border border-white/10 rounded-3xl hover:border-[#FF5E1E]/50 transition-all flex items-center justify-between group shadow-xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#161C28] border border-[#FF5E1E]/30 flex items-center justify-center text-[#FF5E1E] glow-neon-subtle">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="text-sm font-bold text-[#F6F4EE] font-mono-tech">Warranty & Tech Help</div>
                <div className="text-xs text-[#8E98A8]">Direct workbench tickets</div>
              </div>
            </div>
            <ArrowRight size={16} className="text-[#8E98A8] group-hover:text-[#FF5E1E] transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};
