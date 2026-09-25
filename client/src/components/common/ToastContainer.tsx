import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-2xl shadow-[0_8px_40px_-12px_rgba(255,94,30,0.35)] border text-xs font-mono-tech transition-all duration-200 backdrop-blur-xl ${
              isSuccess
                ? 'bg-white/95 text-[#2A1A12] border-emerald-500/40'
                : isError
                ? 'bg-white/95 text-[#2A1A12] border-[#FF5E1E]'
                : 'bg-white/95 text-[#2A1A12] border-[#F0D3B8]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isSuccess && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
              {isError && <AlertCircle size={16} className="text-[#FF5E1E] shrink-0" />}
              {!isSuccess && !isError && <Info size={16} className="text-[#FF7A00] shrink-0" />}
              <span className="font-light">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8A6A54] hover:text-[#2A1A12] p-1 transition-colors cursor-pointer"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
