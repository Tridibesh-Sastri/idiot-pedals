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
    <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-md w-full mx-auto bg-white border border-[#F0D3B8] rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center backdrop-blur-xl relative z-10">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
          <Mail size={24} />
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-editorial font-normal uppercase text-[#2A1A12]">
            Verify Email
          </h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            We sent a verification code to <span className="text-[#2A1A12] font-medium">{user?.email || 'your email'}</span>.
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
              className="w-full text-center tracking-widest text-lg font-mono-tech bg-[#FFF1E6] border border-[#F0D3B8] rounded-full py-3.5 text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E]"
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
          <Link to="/account" className="text-xs font-mono-tech text-[#8A6A54] hover:text-[#2A1A12]">
            Skip for now & go to Account
          </Link>
        </div>
      </div>
    </div>
  );
};
