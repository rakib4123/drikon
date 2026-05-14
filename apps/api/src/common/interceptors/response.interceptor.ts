import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';

export interface ApiResponse<T> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
}

/**
 * Uniform success envelope.
 * Errors are handled by AllExceptionsFilter.
 *
 * NOTE: Controllers that return Express `Response` directly (e.g. file streams)
 * should set `@SkipResponseInterceptor()` — we wrap only object payloads.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request & { id?: string }>();
    return next.handle().pipe(
      map((data) => {
        // If the controller already returned a fully-formed response
        // (e.g. with its own `success` flag), pass through unchanged.
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return {
          success: true,
          data,
          requestId: req.id,
          timestamp: new Date().toISOString(),
        } satisfies ApiResponse<unknown>;
      }),
    );
  }
}
