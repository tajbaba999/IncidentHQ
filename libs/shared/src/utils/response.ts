export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  correlationId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { data, message };
}

export function errorResponse(error: string, correlationId?: string): ApiResponse {
  return { error, correlationId };
}

export function paginatedResponse<T>(
  data: T,
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default {
  success: successResponse,
  error: errorResponse,
  paginated: paginatedResponse,
};