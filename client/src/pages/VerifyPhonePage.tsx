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
    <div className="min-h-screen bg-[#0B0B0A] text-[#F3EFE6] flex flex-col justify-center py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-8 space-y-6 shadow-2xl text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18]">
          <Phone size={24} />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-cinzel font-black uppercase text-[#F3EFE6]">
            Phone Verification
          </h2>
          <p className="text-xs text-[#8C857A]">
            Enter the 4-digit OTP sent to <span className="text-[#F3EFE6] font-medium">{user?.phone || '+91 98765 43210'}</span> to receive live courier tracking SMS updates.
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
              className="w-full text-center tracking-widest text-2xl font-mono-tech bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg py-3 text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-mono-tech font-bold uppercase rounded flex items-center justify-center gap-2 shadow-lg shadow-[#D91E18]/25"
          >
            {loading ? 'Validating...' : 'Verify Phone Number'}
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="pt-2">
          <Link to="/account" className="text-xs text-[#8C857A] hover:text-[#F3EFE6]">
            Skip for now & continue to Account
          </Link>
        </div>
      </div>
    </div>
  );
};
