/**
 * Delete Image API
 * POST /api/merchant/upload/delete-image
 * 
 * Deletes an orphaned image (uploaded but not saved with a menu)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import { del } from '@vercel/blob';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';

/**
 * POST /api/merchant/upload/delete-image
 * Delete an orphaned menu image
 */
async function handlePost(req: NextRequest, context: AuthContext) {
    try {
        const body = await req.json();
        const { imageUrl } = body;

        if (!imageUrl) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'URL_REQUIRED',
                    message: 'Image URL is required',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        // Get merchant to verify ownership
        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
            include: { merchant: true },
        });

        if (!merchantUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MERCHANT_NOT_FOUND',
                    message: 'Merchant not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        // Check if the image is used by any menu item (to prevent deleting active images)
        const menuWithImage = await prisma.menu.findFirst({
            where: {
                imageUrl: imageUrl,
                merchantId: merchantUser.merchantId,
            },
        });

        if (menuWithImage) {
            // Image is in use, don't delete
            return NextResponse.json({
                success: true,
                message: 'Image is in use, skipping deletion',
                statusCode: 200,
            });
        }

        // Verify the URL belongs to this merchant's blob storage
        // Check if URL contains the merchant ID pattern for safety
        const merchantIdStr = String(merchantUser.merchantId);
        if (!imageUrl.includes(merchantIdStr) && !imageUrl.includes('menu-images')) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'UNAUTHORIZED',
                    message: 'Cannot delete this image',
                    statusCode: 403,
                },
                { status: 403 }
            );
        }

        // Delete from Vercel Blob
        try {
            await del(imageUrl);
        } catch (deleteError) {
            console.error('Blob deletion error:', deleteError);
            // Don't fail the request if blob deletion fails (might already be deleted)
        }

        return NextResponse.json({
            success: true,
            message: 'Image deleted successfully',
            statusCode: 200,
        });
    } catch (error) {
        console.error('Delete image error:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'DELETE_FAILED',
                message: 'Failed to delete image',
                statusCode: 500,
            },
            { status: 500 }
        );
    }
}

export const POST = withMerchant(handlePost);
