import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

import type { MerchantFormData } from '@/components/merchants/merchant-edit/types';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';

export interface TableSettingsTabProps {
  formData: MerchantFormData;
  setFormData: React.Dispatch<React.SetStateAction<MerchantFormData>>;
}

export default function TableSettingsTab({ formData, setFormData }: TableSettingsTabProps) {
  return (
    <div className="space-y-6">
      <SettingsCard
        title="Table settings"
        description="Configure table settings used by QR ordering and dine-in flows."
        rightSlot={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/20">
            <FaInfoCircle className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
        }
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Total tables</label>
          <input
            type="number"
            min={0}
            max={999}
            value={formData.totalTables ?? ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                totalTables: e.target.value ? parseInt(e.target.value, 10) : null,
              }))
            }
            data-tutorial="table-settings-total-tables"
            className="h-10 w-full max-w-60 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Used to generate QR codes and validate table number input. Leave empty if you don&apos;t use table-based ordering.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
