/**
 * Global Error Handler Middleware
 * Returns standardized error responses
 */

import { NextResponse } from 'next/server';
import { CustomError, ERROR_CODES, ERROR_MESSAGES } from '@/lib/constants/errors';
import { ApiErrorResponse } from '@/lib/types/api';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * Handle errors and return standardized API response
 * @param error - Error object
 * @returns NextResponse with error details
 */
export function handleError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);

  // Handle CustomError instances
  if (error instanceof CustomError) {
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: error.errorCode,
        message: error.message,
        statusCode: error.statusCode,
      },
      { status: error.statusCode }
    );
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: Record<string, unknown> };
    
    if (prismaError.code === 'P2002') {
      // Unique constraint violation
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
    
    if (prismaError.code === 'P2025') {
      // Record not found
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
  }

  // Handle generic errors
  if (error instanceof Error) {
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

  // Unknown error
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
  const serializedData = serializeBigInt(data);
  
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
