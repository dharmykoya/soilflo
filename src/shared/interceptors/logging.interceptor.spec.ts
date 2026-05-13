import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { Request, Response } from 'express';
import { LoggingInterceptor } from './logging.interceptor';

const makeContext = (method = 'GET', url = '/test', statusCode = 200): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: (): Partial<Request> => ({ method, url }),
      getResponse: (): Partial<Response> => ({ statusCode } as Partial<Response>),
    }),
  }) as ExecutionContext;

const callHandler = (data: unknown = {}): CallHandler =>
  ({ handle: () => of(data) }) as CallHandler;

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    // Suppress output during tests while still verifying it's called
    logSpy = jest.spyOn(interceptor['logger'], 'log').mockImplementation(() => undefined);
  });

  afterEach(() => logSpy.mockRestore());

  it('passes the response value through unchanged', (done) => {
    const payload = { id: 1 };
    interceptor
      .intercept(makeContext(), callHandler(payload))
      .subscribe((value) => {
        expect(value).toBe(payload);
        done();
      });
  });

  it('logs METHOD, URL, status code and duration after the response', (done) => {
    interceptor
      .intercept(makeContext('POST', '/tickets', 201), callHandler())
      .subscribe(() => {
        expect(logSpy).toHaveBeenCalledTimes(1);
        const message: string = logSpy.mock.calls[0][0];
        expect(message).toContain('POST');
        expect(message).toContain('/tickets');
        expect(message).toContain('201');
        expect(message).toMatch(/\d+\.\d{2}ms/);
        done();
      });
  });
});
