import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { appendErrorLog } from '../utils/error-log';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
        ? (exceptionResponse as Record<string, unknown>)['message']
        : exceptionResponse;

    const errorBody: ErrorResponse = {
      statusCode: status,
      message: message as string | string[],
      error:
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'error' in exceptionResponse
          ? String((exceptionResponse as Record<string, unknown>)['error'])
          : HttpStatus[status] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Write 5xx errors and unexpected exceptions to logs/error.log
    if (status >= 500 || !(exception instanceof HttpException)) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      const logLine =
        `[${errorBody.timestamp}] ${request.method} ${request.url} ${status}\n` +
        `${stack}\n` +
        `---\n`;

      try {
        appendErrorLog(logLine);
      } catch {
        this.logger.error('Failed to write to error log file');
      }

      this.logger.error(`${request.method} ${request.url} ${status}`, stack);
    }

    response.status(status).json(errorBody);
  }
}
