import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Request timing interceptor.
 *
 * Logs response times in milliseconds to the console for every request.
 *
 * Output format:
 *   POST /tickets 201 — 4.20ms
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const startTime = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
        this.logger.log(
          `${req.method} ${req.url} ${res.statusCode} — ${durationMs.toFixed(2)}ms`,
        );
      }),
    );
  }
}
