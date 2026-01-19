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

interface SystemAssetUsage {
  key: string;
  prefix: string;
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

  const systemPrefixes: Array<{ key: string; prefix: string }> = [
    { key: 'avatars', prefix: 'avatars/' },
    { key: 'stockPhotos', prefix: 'stock-photos/' },
  ];

  const systemAssets: SystemAssetUsage[] = await Promise.all(
    systemPrefixes.map(async (asset) => {
      const usage = await BlobService.getPrefixUsage(asset.prefix);
      return {
        key: asset.key,
        prefix: asset.prefix,
        totalBytes: usage.totalBytes,
        objectCount: usage.objectCount,
      };
    })
  );

  const merchantTotals = usageList.reduce(
    (acc, item) => {
      acc.totalBytes += item.totalBytes;
      acc.objectCount += item.objectCount;
      return acc;
    },
    { totalBytes: 0, objectCount: 0 }
  );

  const systemTotals = systemAssets.reduce(
    (acc, item) => {
      acc.totalBytes += item.totalBytes;
      acc.objectCount += item.objectCount;
      return acc;
    },
    { totalBytes: 0, objectCount: 0 }
  );

  const totals = {
    totalBytes: merchantTotals.totalBytes + systemTotals.totalBytes,
    objectCount: merchantTotals.objectCount + systemTotals.objectCount,
  };

  return successResponse(
    {
      merchants: usageList,
      systemAssets,
      systemTotals,
      totals,
    },
    'Storage usage retrieved successfully',
    200
  );
}

export const GET = withSuperAdmin(handleGet);
