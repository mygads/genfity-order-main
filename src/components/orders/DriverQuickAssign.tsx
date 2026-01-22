'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRStatic } from '@/hooks/useSWRWithAuth';
import { useToast } from '@/context/ToastContext';
import { hasStaffPermission, isMerchantStaff } from '@/lib/utils/adminAuth';
import { STAFF_PERMISSIONS } from '@/lib/constants/permissions';
import { FaTimes } from 'react-icons/fa';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';

type Driver = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
};

type DriversApiResponse = {
  success: boolean;
  data: Driver[];
};

export default function DriverQuickAssign(props: {
  orderId: string;
  currentDriverId?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useSWRStatic<DriversApiResponse>('/api/merchant/drivers');
  const drivers = useMemo(() => (Array.isArray(data?.data) ? data?.data : []), [data]);

  const [selectedDriverId, setSelectedDriverId] = useState<string>(props.currentDriverId || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Only sync from props when user hasn't made a local change.
    if (!isDirty && !isSaving) {
      setSelectedDriverId(props.currentDriverId || '');
    }
  }, [props.currentDriverId]);

  const canManageOrders = !isMerchantStaff() || hasStaffPermission(STAFF_PERMISSIONS.ORDERS);
  const canInteract = canManageOrders && !props.disabled && !isSaving;

  const save = async (driverUserId: string | null) => {
    try {
      setIsSaving(true);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(buildOrderApiUrl(`/api/merchant/orders/${props.orderId}/delivery/assign`), {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverUserId,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to assign driver');
      }

      setIsDirty(false);
      showSuccess(driverUserId ? 'Driver assigned' : 'Driver unassigned');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to assign driver');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={props.className || ''}>
      <div className="flex items-center gap-2">
        <select
          value={selectedDriverId}
          onChange={(e) => {
            setSelectedDriverId(e.target.value);
            setIsDirty(true);
          }}
          disabled={!canInteract || isLoading}
          className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-800 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">Unassigned</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!canInteract) return;
            setSelectedDriverId('');
            setIsDirty(true);
            void save(null);
          }}
          disabled={!canInteract}
          className="h-8 shrink-0 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          title="Unassign"
          aria-label="Unassign driver"
        >
          <FaTimes className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void save(selectedDriverId ? selectedDriverId : null);
          }}
          disabled={!canInteract || (!isDirty && (selectedDriverId || '') === (props.currentDriverId || ''))}
          className="h-8 shrink-0 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {isSaving ? 'Saving' : 'Assign'}
        </button>
      </div>

      {!canManageOrders ? (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">You don’t have permission to assign drivers.</p>
      ) : null}
    </div>
  );
}
