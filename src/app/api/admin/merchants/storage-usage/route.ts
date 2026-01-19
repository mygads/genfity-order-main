/**
 * GET /api/admin/merchants/storage-usage
 * Get storage usage per merchant (Super Admin only)
 */

import { NextRequest } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { successResponse } from '@/lib/middleware/errorHandler';
import { AuthContext } from '@/lib/types/auth';
import merchantRepository from '@/lib/repositories/MerchantRepository';
import { BlobService } from '@/lib/services/BlobService';

interface MerchantStorageUsage {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  totalBytes: number;
  objectCount: number;
}

async function handleGet(
  _request: NextRequest,
  _authContext: AuthContext
) {
  const merchants = await merchantRepository.findAllForStorageUsage();

  const usageList = await Promise.all(
    merchants.map(async (merchant) => {
      const code = merchant.code || '';
      const prefix = code ? `merchants/${code}/` : 'merchants/';
      const usage = await BlobService.getPrefixUsage(prefix);

      return {
        id: String(merchant.id),
        name: merchant.name,
        code: code,
        isActive: Boolean(merchant.isActive),
        totalBytes: usage.totalBytes,
        objectCount: usage.objectCount,
      } as MerchantStorageUsage;
    })
  );

  const totals = usageList.reduce(
    (acc, item) => {
      acc.totalBytes += item.totalBytes;
      acc.objectCount += item.objectCount;
      return acc;
    },
    { totalBytes: 0, objectCount: 0 }
  );

  return successResponse(
    {
      merchants: usageList,
      totals,
    },
    'Storage usage retrieved successfully',
    200
  );
}

export const GET = withSuperAdmin(handleGet);
