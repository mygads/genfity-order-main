/**
 * Delete Stock Photo Blob API
 * DELETE /api/admin/stock-photos/delete-blob
 * 
 * Deletes an orphaned stock photo blob (uploaded but not saved)
 * Used by bulk upload page when user cancels or removes a photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';
import type { AuthContext } from '@/lib/middleware/auth';

/**
 * DELETE - Delete a blob by URL
 */
async function deleteHandler(request: NextRequest, _authContext: AuthContext) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'URL is required',
        statusCode: 400,
      }, { status: 400 });
    }

    // Verify it's a stock photo URL (for safety)
    if (!url.includes('stock-photos')) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Can only delete stock photo blobs',
        statusCode: 400,
      }, { status: 400 });
    }

    await BlobService.deleteFile(url);

    return NextResponse.json({
      success: true,
      message: 'Blob deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Stock photo blob delete error:', error);
    return NextResponse.json({
      success: false,
      error: 'DELETE_ERROR',
      message: 'Failed to delete blob',
      statusCode: 500,
    }, { status: 500 });
  }
}

export const DELETE = withSuperAdmin(deleteHandler);
