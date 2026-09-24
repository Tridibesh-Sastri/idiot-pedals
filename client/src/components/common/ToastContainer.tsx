import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded shadow-2xl border text-xs font-medium transition-all duration-200 ${
              isSuccess
                ? 'bg-[#171513] text-[#F3EFE6] border-emerald-600/40'
                : isError
                ? 'bg-[#171513] text-[#F3EFE6] border-[#D91E18]'
                : 'bg-[#171513] text-[#F3EFE6] border-[#8C857A]/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isSuccess && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
              {isError && <AlertCircle size={16} className="text-[#D91E18] shrink-0" />}
              {!isSuccess && !isError && <Info size={16} className="text-sky-400 shrink-0" />}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#8C857A] hover:text-[#F3EFE6] p-1 transition-colors"
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
