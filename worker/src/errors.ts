import type { ApiErrorCode } from '../../shared/api';
export class ApiError extends Error {
  constructor(public code: ApiErrorCode, public status: number) { super(code); }
}
