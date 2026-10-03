import React from 'react';
import { AlertCircle, Loader2, PackageOpen, RefreshCw, WifiOff, ShieldAlert, SearchX, ServerCrash } from 'lucide-react';
import { ApiError } from '../../lib/api';

/**
 * Shared async UI primitives — used by every data-driven page so loading,
 * empty and error states look identical across the site instead of being
 * re-invented per page.
 *
 * Styling follows the existing warm-cream / molten-orange tokens.
 */

const shell =
  'bg-white border border-[#F0D3B8] rounded-3xl p-10 sm:p-12 text-center space-y-4 shadow-xl backdrop-blur-xl';

const iconWrap = (tone: 'accent' | 'danger' | 'muted') =>
  `w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border ${
    tone === 'danger'
      ? 'bg-red-50 border-red-500/30 text-red-500'
      : tone === 'accent'
        ? 'bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border-[#FF5E1E]/30 text-white shadow-lg shadow-[#FF5E1E]/30'
        : 'bg-[#FFF1E6] border-[#F0D3B8] text-[#8A6A54]'
  }`;

/* -------------------------------------------------------------------------- */
/* Loading                                                                     */
/* -------------------------------------------------------------------------- */

export const LoadingState: React.FC<{ message?: string; compact?: boolean }> = ({
  message = 'Loading…',
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-xs font-mono-tech text-[#8A6A54]">
        <Loader2 size={16} className="animate-spin text-[#FF5E1E]" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className={shell} role="status" aria-live="polite">
      <div className={iconWrap('accent')}>
        <Loader2 size={22} className="animate-spin" />
      </div>
      <p className="text-xs font-mono-tech text-[#8A6A54]">{message}</p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Error                                                                       */
/* -------------------------------------------------------------------------- */

const iconFor = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return WifiOff;
    if (error.kind === 'forbidden' || error.kind === 'unauthorized') return ShieldAlert;
    if (error.kind === 'not_found') return SearchX;
    if (error.kind === 'server' || error.kind === 'unavailable') return ServerCrash;
  }
  return AlertCircle;
};

const titleFor = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'network':
        return 'Connection Problem';
      case 'timeout':
        return 'Request Timed Out';
      case 'unauthorized':
        return 'Session Expired';
      case 'forbidden':
        return 'Not Authorized';
      case 'not_found':
        return 'Not Found';
      case 'rate_limited':
        return 'Too Many Requests';
      case 'validation':
      case 'conflict':
        return 'Action Could Not Be Completed';
      case 'server':
      case 'unavailable':
        return 'Server Error';
      case 'invalid_response':
        return 'Unexpected API Response';
      default:
        return 'Something Went Wrong';
    }
  }
  return 'Something Went Wrong';
};

interface ErrorStateProps {
  error: unknown;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  children?: React.ReactNode;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  message,
  onRetry,
  retryLabel = 'Try Again',
  children,
}) => {
  const Icon = iconFor(error);
  const title = titleFor(error);
  const body = message ?? (error instanceof Error ? error.message : 'Something unexpected happened. Please try again.');
  const retryable = onRetry && (!(error instanceof ApiError) || error.isRetryable);

  return (
    <div className={shell} role="alert">
      <div className={iconWrap('danger')}>
        <Icon size={22} />
      </div>
      <h3 className="text-xl font-editorial font-bold text-[#2A1A12]">{title}</h3>
      <p className="text-xs text-[#8A6A54] font-mono-tech max-w-md mx-auto leading-relaxed">{body}</p>

      {error instanceof ApiError && error.fieldErrors.length > 0 && (
        <ul className="text-left max-w-md mx-auto space-y-1 text-[11px] font-mono-tech text-[#8A6A54] bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl p-4">
          {error.fieldErrors.slice(0, 6).map((fieldError) => (
            <li key={`${fieldError.field}-${fieldError.message}`}>
              <span className="text-[#2A1A12] font-bold">{fieldError.field || 'Field'}:</span> {fieldError.message}
            </li>
          ))}
        </ul>
      )}

      {children}

      {retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25 transition-all cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>{retryLabel}</span>
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Empty                                                                       */
/* -------------------------------------------------------------------------- */

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action }) => (
  <div className={shell}>
    <div className={iconWrap('muted')}>{icon ?? <PackageOpen size={22} />}</div>
    <h3 className="text-xl font-editorial font-bold text-[#2A1A12]">{title}</h3>
    {description && (
      <p className="text-xs text-[#8A6A54] font-mono-tech max-w-md mx-auto leading-relaxed">{description}</p>
    )}
    {action}
  </div>
);
