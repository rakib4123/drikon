import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection via the OWASP "custom request header" pattern.
 *
 * Auth rides on cookies, and the cross-site deployment forces SameSite=None, so
 * SameSite alone gives no CSRF protection. Browsers, however, forbid attaching a
 * custom header to a forged cross-site request without a CORS preflight — and our
 * CORS only allows the trusted web origin. So a malicious page cannot set this
 * header on the victim's behalf. We require it on every state-changing request
 * that isn't a public, pre-auth route.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ method: string; headers: Record<string, unknown> }>();
    if (SAFE_METHODS.has(req.method)) return true;

    // Public routes (login/register/forgot/reset/refresh, public coupon checks)
    // don't act on the victim's session, so CSRF doesn't apply to them.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const token = req.headers['x-csrf-token'];
    if (typeof token !== 'string' || token.length < 16) {
      throw new ForbiddenException('Missing or invalid CSRF token');
    }
    return true;
  }
}
