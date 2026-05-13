import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PaginatedData<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type ResponsePayload<T> = { data: T } | PaginatedData<T>;

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponsePayload<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponsePayload<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the handler already returned a paginated envelope, pass through
        if (
          data !== null &&
          typeof data === 'object' &&
          'data' in (data as object) &&
          'meta' in (data as object)
        ) {
          return data as unknown as PaginatedData<T>;
        }
        return { data };
      }),
    );
  }
}
