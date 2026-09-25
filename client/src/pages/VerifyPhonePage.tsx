import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const VerifyPhonePage: React.FC = () => {
  const { user, verifyPhone } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyPhone(otp);
      showToast('Phone verified! Tracking SMS enabled.');
      navigate('/account');
    } catch {
      showToast('Please enter the 4-digit code (e.g. 1234).', 'error');
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
          <Phone size={24} />
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-editorial font-normal uppercase text-[#2A1A12]">
            Phone Verification
          </h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            Enter the 4-digit OTP sent to <span className="text-[#2A1A12] font-medium">{user?.phone || '+91 98765 43210'}</span> to receive live courier tracking SMS updates.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={4}
              placeholder="1234"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-widest text-2xl font-mono-tech bg-[#FFF1E6] border border-[#F0D3B8] rounded-full py-3.5 text-[#2A1A12] focus:outline-none focus:border-[#FF5E1E]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all cursor-pointer"
          >
            <span>{loading ? 'Validating...' : 'Verify Phone Number'}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="pt-2">
          <Link to="/account" className="text-xs font-mono-tech text-[#8A6A54] hover:text-[#2A1A12]">
            Skip for now & continue to Account
          </Link>
        </div>
      </div>
    </div>
  );
};
