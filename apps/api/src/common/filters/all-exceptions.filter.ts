import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * One filter to rule them all.
 * - Turns Prisma errors into proper HTTP errors.
 * - Never leaks stack traces or DB internals in production.
 * - Always logs the original error server-side with the request ID for forensics.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly isProduction: boolean) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any).message ?? body;
      code = (body as any)?.code ?? this.codeFromStatus(status);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violations etc. → 409
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          code = 'DUPLICATE_RECORD';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          code = 'NOT_FOUND';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Database error';
          code = 'DB_ERROR';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid input';
      code = 'VALIDATION_ERROR';
    }

    // Always log server-side. The real error stays with us, not the client.
    this.logger.error({
      requestId: req.id,
      path: req.url,
      method: req.method,
      status,
      err: exception instanceof Error ? { name: exception.name, message: exception.message, stack: exception.stack } : exception,
    });

    res.status(status).json({
      success: false,
      error: {
        code,
        message: this.sanitize(message),
        // Only expose stack in dev — never in prod.
        ...(this.isProduction
          ? {}
          : { stack: exception instanceof Error ? exception.stack : undefined }),
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMITED',
    };
    return map[status] ?? 'ERROR';
  }

  /** Defensive: never let raw error objects with sensitive fields leak. */
  private sanitize(msg: string | object): string | object {
    if (typeof msg === 'string') return msg;
    // If validation errors come through, strip any keys that look like secrets.
    if (Array.isArray(msg)) return msg;
    const blacklist = new Set(['password', 'token', 'secret', 'cookie']);
    return Object.fromEntries(
      Object.entries(msg).filter(([k]) => !blacklist.has(k.toLowerCase())),
    );
  }
}
