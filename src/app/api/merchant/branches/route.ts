/**
 * Branch Management API (Merchant Owner)
 * GET /api/merchant/branches - list owner's merchant groups
 * POST /api/merchant/branches - create new branch/outlet
 */

import { NextRequest } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import prisma from '@/lib/db/client';
import merchantService, { type CreateBranchInput } from '@/lib/services/MerchantService';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

function normalizeBranchPayload(body: Record<string, unknown>): Omit<CreateBranchInput, 'parentMerchantId'> {
  return {
    name: String(body.name || '').trim(),
    code: String(body.code || '').trim(),
    description: typeof body.description === 'string' ? body.description : undefined,
    address: typeof body.address === 'string' ? body.address : undefined,
    phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber : undefined,
    email: typeof body.email === 'string' ? body.email : undefined,
    isOpen: typeof body.isOpen === 'boolean' ? body.isOpen : undefined,
    country: typeof body.country === 'string' ? body.country : undefined,
    currency: typeof body.currency === 'string' ? body.currency : undefined,
    timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
    latitude: typeof body.latitude === 'number' ? body.latitude : null,
    longitude: typeof body.longitude === 'number' ? body.longitude : null,
  };
}

async function getOwnerBranchesHandler(_request: NextRequest, authContext: AuthContext) {
  try {
    const ownerLinks = await prisma.merchantUser.findMany({
      where: {
        userId: authContext.userId,
        role: 'OWNER',
        isActive: true,
      },
      include: {
        merchant: {
          include: {
            parentMerchant: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            branches: {
              select: {
                id: true,
                code: true,
                name: true,
                branchType: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    const merchants = ownerLinks.map((link) => {
      const merchant = link.merchant;
      return {
        id: merchant.id.toString(),
        code: merchant.code,
        name: merchant.name,
        branchType: merchant.branchType,
        parentMerchantId: merchant.parentMerchantId ? merchant.parentMerchantId.toString() : null,
        parentMerchantName: merchant.parentMerchant?.name || null,
        isActive: merchant.isActive,
        currency: merchant.currency,
        timezone: merchant.timezone,
        address: merchant.address,
        city: merchant.city,
        country: merchant.country,
        logoUrl: merchant.logoUrl,
        branches: (merchant.branches || []).map((branch) => ({
          id: branch.id.toString(),
          code: branch.code,
          name: branch.name,
          branchType: branch.branchType,
          isActive: branch.isActive,
        })),
      };
    });

    const grouped = new Map<string, { main: typeof merchants[number]; branches: typeof merchants[number][] }>();
    merchants.forEach((merchant) => {
      const mainId = merchant.parentMerchantId || merchant.id;
      const group = grouped.get(mainId) || { main: merchant, branches: [] };

      if (merchant.parentMerchantId) {
        group.branches.push(merchant);
      } else {
        group.main = merchant;
      }

      grouped.set(mainId, group);
    });

    return successResponse(
      {
        merchants,
        groups: Array.from(grouped.values()),
      },
      'Branches retrieved successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

async function createBranchHandler(request: NextRequest, authContext: AuthContext) {
  try {
    const body = await request.json();
    const payload = normalizeBranchPayload(body || {});

    if (!payload.name || !payload.code) {
      throw new ValidationError('Merchant name and code are required', ERROR_CODES.VALIDATION_FAILED);
    }

    const targetParentId = body?.parentMerchantId
      ? BigInt(body.parentMerchantId)
      : authContext.merchantId;

    if (!targetParentId) {
      throw new ValidationError('Parent merchant is required', ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const branch = await merchantService.createBranch(authContext.userId, {
      ...payload,
      parentMerchantId: targetParentId,
    });

    return successResponse(
      { merchant: branch },
      'Branch created successfully',
      201
    );
  } catch (error) {
    return handleError(error);
  }
}

export const GET = withMerchantOwner(getOwnerBranchesHandler);
export const POST = withMerchantOwner(createBranchHandler);
