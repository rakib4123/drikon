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

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
