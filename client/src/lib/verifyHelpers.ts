export type ViewState =
  | 'idle'
  | 'loading'
  | 'verified'
  | 'already_verified'
  | 'expired'
  | 'invalid'
  | 'no_token'
  | 'error';

export interface VerifyCopy {
  title: string;
  body: string;
}

/**
 * Pure copy map for every settled view. Unit-tested: the invalid copy must
 * stay honest (invalid, expired, or replaced — never "try the same link
 * again"), and no settled view may offer a futile same-token retry.
 *
 * The 'expired' and 'invalid' cases ignore any server message to ensure
 * misleading text ("may have already been used") is never shown.
 */
export function verifyCopyFor(view: ViewState, message: string = ''): VerifyCopy | null {
  switch (view) {
    case 'verified':
      return {
        title: 'Email Verified',
        body: message || 'Your account has been created. You can now sign in to the workbench.',
      };
    case 'already_verified':
      return {
        title: 'Already Verified',
        body: message || 'This email address already has a verified account. Try signing in instead.',
      };
    case 'expired':
      return {
        title: 'Link Expired',
        body: 'This verification link has expired. Resend a fresh link below. Only the newest email works.',
      };
    case 'invalid':
      return {
        title: 'Invalid Link',
        body: 'This link does not match any pending verification. It may be invalid, expired, or replaced by a newer email. Only the newest email works. If you already verified, sign in. Otherwise resend a fresh link below or register again.',
      };
    case 'no_token':
      return {
        title: 'Verify Email',
        body: 'Open the verification link from your registration email to activate your account.',
      };
    case 'error':
      return {
        title: 'Verification Failed',
        body: message || 'We could not verify your email right now. Please try again.',
      };
    default:
      return null;
  }
}

/**
 * Pure countdown label for the resend button. Unit-tested.
 */
export function resendCountdownLabel(seconds: number): string {
  const remaining = Math.max(0, Math.floor(seconds));
  return remaining > 0 ? `Resend again in ${remaining}s` : 'Resend email';
}
