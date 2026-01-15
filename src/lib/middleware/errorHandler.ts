/**
 * Global Error Handler Middleware
 * Returns standardized error responses
 */

import { NextResponse } from 'next/server';
import { CustomError, ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/errors';
import { ApiErrorResponse } from '@/lib/types/api';
import { serializeData } from '@/lib/utils/serializer';

/**
 * Handle errors and return standardized API response
 * @param error - Error object
 * @returns NextResponse with error details
 */
export function handleError(error: unknown): NextResponse<ApiErrorResponse> {
  // Handle CustomError instances (expected errors like auth failures, validation, etc.)
  if (error instanceof CustomError) {
    // Only log server errors (5xx), not client errors (4xx)
    if (error.statusCode >= 500) {
      console.error('API Error:', error);
    }

    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: error.errorCode,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.details ? { details: serializeData(error.details) } : {}),
      },
      { status: error.statusCode }
    );
  }

  // Handle Prisma errors - these are unexpected, always log
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: Record<string, unknown> };

    // P2002: Unique constraint (409 Conflict) - expected in some cases, don't log
    if (prismaError.code === 'P2002') {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: ERROR_CODES.CONFLICT,
          message: 'Record already exists',
          statusCode: 409,
        },
        { status: 409 }
      );
    }

    // P2025: Record not found (404) - expected in some cases, don't log
    if (prismaError.code === 'P2025') {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: ERROR_CODES.NOT_FOUND,
          message: 'Record not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Other Prisma errors are unexpected - log them
    console.error('Prisma Error:', error);
  }

  // Handle generic errors - these are unexpected, always log
  if (error instanceof Error) {
    console.error('Unexpected Error:', error);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: ERROR_CODES.INTERNAL_ERROR,
        message:
          process.env.NODE_ENV === 'development'
            ? error.message
            : ERROR_MESSAGES.INTERNAL_ERROR,
        statusCode: 500,
      },
      { status: 500 }
    );
  }

  // Unknown error - always log
  console.error('Unknown Error:', error);
  return NextResponse.json<ApiErrorResponse>(
    {
      success: false,
      error: ERROR_CODES.INTERNAL_ERROR,
      message: ERROR_MESSAGES.INTERNAL_ERROR,
      statusCode: 500,
    },
    { status: 500 }
  );
}

/**
 * Create success response
 * @param data - Response data
 * @param message - Success message
 * @param statusCode - HTTP status code
 * @returns NextResponse with success data
 */
export function successResponse<T>(
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): NextResponse {
  // Serialize BigInt to string to avoid JSON errors
  const serializedData = serializeData(data);

  return NextResponse.json(
    {
      success: true,
      data: serializedData,
      message,
      statusCode,
    },
    { status: statusCode }
  );
}
