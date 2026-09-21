import { Role } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;       // user id
  email: string;
  role: Role;
  type: 'access';
  jti?: string;      // JWT id for revocation
}

export interface JwtRefreshPayload {
  sub: string;
  sid: string;       // session id — for rotation lookups
  type: 'refresh';
  jti: string;
}

/**
 * Short-lived proof that the first factor passed but the second is still owed.
 * Issued after Google sign-in for a 2FA account; exchanged at /auth/2fa/verify.
 */
export interface JwtTwoFactorPendingPayload {
  sub: string;
  type: '2fa_pending';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
