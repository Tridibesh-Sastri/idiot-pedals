import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const VerifyEmailPage: React.FC = () => {
  const { user, verifyEmail } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmail(code);
      showToast('Email verified successfully!');
      navigate('/account');
    } catch {
      showToast('Please enter the verification code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F6F4EE] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-md w-full mx-auto bg-[#121722]/80 border border-white/10 rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center backdrop-blur-xl relative z-10">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#161C28] border border-[#FF5E1E]/30 flex items-center justify-center text-[#FF5E1E] glow-neon-subtle">
          <Mail size={24} />
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-editorial font-normal uppercase text-[#F6F4EE]">
            Verify Email
          </h2>
          <p className="text-xs text-[#8E98A8] font-mono-tech">
            We sent a verification code to <span className="text-[#F6F4EE] font-medium">{user?.email || 'your email'}</span>.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter Code (e.g. 7792)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full text-center tracking-widest text-lg font-mono-tech bg-[#0B0E14] border border-white/15 rounded-full py-3.5 text-[#F6F4EE] focus:outline-none focus:border-[#FF5E1E]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all cursor-pointer"
          >
            <span>{loading ? 'Confirming...' : 'Verify Email Address'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="pt-2">
          <Link to="/account" className="text-xs font-mono-tech text-[#8E98A8] hover:text-[#F6F4EE]">
            Skip for now & go to Account
          </Link>
        </div>
      </div>
    </div>
  );
};
