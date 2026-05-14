import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import { JwtAccessPayload } from '../interfaces/jwt.interface';
import { AuthenticatedUser } from '../../../common/decorators';

/**
 * Reads the access token from the `drikon_access` httpOnly cookie.
 * No localStorage. No Authorization header in browser flows.
 *
 * The Authorization header is supported as a fallback for server-to-server / mobile.
 */
function cookieExtractor(req: Request): string | null {
  return req?.signedCookies?.['drikon_access'] ?? req?.cookies?.['drikon_access'] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      // We bind the strategy to the type field to prevent a refresh token
      // from being accepted in place of an access token.
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Verify the user still exists and is not banned/locked.
    // (One DB hit per request, but small and indexed — acceptable trade for safety.)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, lockedUntil: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
