/**
 * Canonical public projection of a user document.
 *
 * Kept in one place so every endpoint that returns the current user
 * (`/api/auth/me`, `/api/auth/login`, `/api/users/me`, ...) has an identical
 * shape and never leaks `passwordHash`, `authProviders` or internal fields.
 */
export const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  addresses: user.addresses,
  role: user.role,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
})

/** Fields selected when re-reading a user for a public response. */
export const PUBLIC_USER_FIELDS =
  '_id name email phone addresses role emailVerified phoneVerified'

export default serializeUser
