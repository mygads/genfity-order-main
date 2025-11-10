/**
 * API Response Types
 * Standard response format for all API endpoints
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
  statusCode: number;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
