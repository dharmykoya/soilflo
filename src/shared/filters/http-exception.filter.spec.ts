import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

// Mock the shared error-log utility so we don't touch the filesystem in tests
jest.mock('../utils/error-log', () => ({ appendErrorLog: jest.fn() }));
import { appendErrorLog } from '../utils/error-log';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeHost = (method = 'GET', url = '/test') => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method, url }),
      }),
    } as unknown as ArgumentsHost,
    status,
    json,
  };
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.clearAllMocks();
  });

  it('returns the correct status and body for a 400 HttpException', () => {
    const { host, status, json } = makeHost('POST', '/tickets');
    filter.catch(new HttpException('Bad Request', HttpStatus.BAD_REQUEST), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, path: '/tickets' }),
    );
  });

  it('does NOT write to error.log for 4xx errors', () => {
    const { host } = makeHost();
    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host);

    expect(appendErrorLog).not.toHaveBeenCalled();
  });

  it('returns 500 and writes to error.log for a 500 HttpException', () => {
    const { host, status } = makeHost('GET', '/crash');
    filter.catch(
      new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(appendErrorLog).toHaveBeenCalledTimes(1);
    const logEntry: string = (appendErrorLog as jest.Mock).mock.calls[0][0];
    expect(logEntry).toContain('GET /crash');
    expect(logEntry).toContain('500');
  });

  it('treats unknown (non-HttpException) errors as 500 and logs them', () => {
    const { host, status } = makeHost('DELETE', '/something');
    filter.catch(new Error('Unexpected crash'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(appendErrorLog).toHaveBeenCalledTimes(1);
  });

  it('includes the request path in the response body', () => {
    const { host, json } = makeHost('GET', '/api/sites');
    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/sites' }));
  });

  it('includes a timestamp in the response body', () => {
    const { host, json } = makeHost();
    filter.catch(new HttpException('Bad Request', HttpStatus.BAD_REQUEST), host);

    const body = (json as jest.Mock).mock.calls[0][0] as { timestamp: string };
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it('continues gracefully and logs a warning when the error-log write fails (best-effort)', () => {
    (appendErrorLog as jest.Mock).mockImplementationOnce(() => { throw new Error('disk full'); });
    const { host, status } = makeHost('POST', '/crash');

    // Should not throw even when appendErrorLog fails
    expect(() =>
      filter.catch(new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR), host),
    ).not.toThrow();
    expect(status).toHaveBeenCalledWith(500);
  });
});
