import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Turns server error bodies into readable Error messages (M1). The store's handlers already do
 * `patchState(store, { error: err.message })`; with this, a Live-campaign lock or a stale-state rejection
 * reaches the GM as the server's own explanation instead of "Http failure response … 409 Conflict".
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const body = err.error;
      const message =
        (typeof body === 'object' && body && (body.message ?? body.title)) ||
        (typeof body === 'string' && body.trim()) ||
        err.message;
      const e = new Error(String(message)) as Error & { status?: number; code?: string };
      e.status = err.status;
      e.code = typeof body === 'object' && body ? body.error : undefined;
      return throwError(() => e);
    }),
  );
