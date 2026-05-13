import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

const callHandler = (data: unknown): CallHandler =>
  ({ handle: () => of(data) }) as CallHandler;

const mockContext = (): ExecutionContext => ({}) as ExecutionContext;

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('wraps a plain object in { data }', (done) => {
    interceptor.intercept(mockContext(), callHandler({ foo: 'bar' })).subscribe((value) => {
      expect(value).toEqual({ data: { foo: 'bar' } });
      done();
    });
  });

  it('wraps an array in { data }', (done) => {
    interceptor.intercept(mockContext(), callHandler([1, 2, 3])).subscribe((value) => {
      expect(value).toEqual({ data: [1, 2, 3] });
      done();
    });
  });

  it('wraps null in { data }', (done) => {
    interceptor.intercept(mockContext(), callHandler(null)).subscribe((value) => {
      expect(value).toEqual({ data: null });
      done();
    });
  });

  it('passes through a response that already has data + meta (paginated envelope)', (done) => {
    const paginated = {
      data: [{ id: 1 }],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    };
    interceptor.intercept(mockContext(), callHandler(paginated)).subscribe((value) => {
      expect(value).toBe(paginated);
      done();
    });
  });
});
