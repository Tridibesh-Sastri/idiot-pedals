import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, ArrowLeft, Construction } from 'lucide-react';

/**
 * Phone/SMS verification is not yet supported by the backend (no OTP endpoints
 * exist). Rather than faking success, this page states the real status and
 * points back to the account page.
 */
export const VerifyPhonePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] flex flex-col justify-center py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-md w-full mx-auto bg-white border border-[#F0D3B8] rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center backdrop-blur-xl relative z-10">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFF1E6] border border-[#F0D3B8] flex items-center justify-center text-[#8A6A54]">
          <Phone size={24} />
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-editorial font-normal uppercase text-[#2A1A12]">
            Phone Verification
          </h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech leading-relaxed">
            SMS verification is not available yet. Your orders and tracking emails work normally — phone
            verification will be enabled once our SMS provider is connected.
          </p>
        </div>

        <div className="p-4 bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl flex items-start gap-2.5 text-left text-[11px] font-mono-tech text-[#8A6A54]">
          <Construction size={14} className="text-[#FF5E1E] mt-0.5 shrink-0" />
          <span>Nothing is required from you right now. This page will be activated in a future update.</span>
        </div>

        <Link
          to="/account"
          className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 transition-all"
        >
          <ArrowLeft size={14} />
          <span>Back To Account</span>
        </Link>
      </div>
    </div>
  );
};
