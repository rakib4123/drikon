import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AUDIT_KEY, type AuditMetadata } from '../decorators';
import { AdminLogModel } from '../../models/admin-log.model';
import type { AuthenticatedUser } from '../decorators';

/**
 * Writes an AdminLog row for any handler tagged with `@Audit(...)`.
 *
 * Registered globally, but inert on undecorated routes — so adding an audit trail
 * to an endpoint is a one-line change at the handler, and there's exactly one place
 * that knows how to record one.
 *
 * Logging happens only after the handler succeeds: a rejected request didn't change
 * anything, so recording it would be noise. A failure to write the log is swallowed
 * (and reported) rather than failing the request the admin already completed.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly adminLogs: AdminLogModel,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMetadata | undefined>(AUDIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const actor = req.user as AuthenticatedUser | undefined;

    return next.handle().pipe(
      tap((result) => {
        if (!actor) return;
        void this.record(meta, actor, req, result);
      }),
    );
  }

  private async record(
    meta: AuditMetadata,
    actor: AuthenticatedUser,
    req: {
      params?: Record<string, string>;
      body?: Record<string, unknown>;
      ip?: string;
      headers?: Record<string, unknown>;
    },
    result: unknown,
  ): Promise<void> {
    try {
      const targetId =
        req.params?.id ??
        (result && typeof result === 'object' && 'id' in result
          ? String((result as { id: unknown }).id)
          : null);

      await this.adminLogs.create({
        data: {
          adminId: actor.id,
          action: meta.action,
          targetType: meta.targetType ?? null,
          targetId,
          // The request body is what actually changed. Redact anything sensitive
          // so the audit trail never becomes a secondary leak.
          metadata: sanitize(req.body) as never,
          ipAddress: req.ip ?? null,
          userAgent: typeof req.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : null,
        },
      });
    } catch (err) {
      this.logger.error({ msg: 'audit.write_failed', action: meta.action, err });
    }
  }
}

const REDACTED_KEYS = new Set([
  'password',
  'newPassword',
  'token',
  'refreshToken',
  'twoFactorCode',
  'secret',
]);

function sanitize(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    out[k] = REDACTED_KEYS.has(k) ? '***REDACTED***' : v;
  }
  return out;
}
