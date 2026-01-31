/**
 * Optimistic Updates Hook Examples
 * Patterns for implementing optimistic UI updates with SWR
 */

import { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';

/**
 * Example: Optimistic Menu Status Toggle
 * 
 * Usage:
 * const { trigger, isMutating } = useOptimisticMenuToggle(menuId);
 * await trigger();
 */
export function useOptimisticMenuToggle(menuId: string) {
  const key = `/api/merchant/menu/${menuId}`;

  return useSWRMutation(
    key,
    async (url) => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(buildOrderApiUrl(url), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'toggleActive' }),
      });

      if (!res.ok) throw new Error('Failed to toggle menu');
      return res.json();
    },
    {
      // Optimistic update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      optimisticData: (currentData: any) => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          data: {
            ...currentData.data,
            isActive: !currentData.data.isActive,
          },
        };
      },
      // Revalidate after mutation
      populateCache: true,
      revalidate: true,
      // Rollback on error
      rollbackOnError: true,
    }
  );
}

/**
 * Example: Optimistic Order Status Update
 * 
 * Usage:
 * const { trigger } = useOptimisticOrderUpdate();
 * await trigger({ orderId, status: 'PROCESSING' });
 */
export function useOptimisticOrderUpdate() {
  const ordersKey = '/api/merchant/orders';

  return useSWRMutation(
    ordersKey,
    async (url, { arg }: { arg: { orderId: string; status: string } }) => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(buildOrderApiUrl(`/api/merchant/orders/${arg.orderId}/status`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: arg.status }),
      });

      if (!res.ok) throw new Error('Failed to update order');
      return res.json();
    },
    {
      // Optimistic update for order list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      optimisticData: (currentData: any, { arg }: { arg: { orderId: string; status: string } }) => {
        if (!currentData?.data) return currentData;

        return {
          ...currentData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: currentData.data.map((order: any) =>
            order.id === arg.orderId
              ? { ...order, status: arg.status }
              : order
          ),
        };
      },
      populateCache: true,
      revalidate: true,
      rollbackOnError: true,
    }
  );
}

/**
 * Example: Optimistic Stock Update
 * 
 * Usage:
 * const { trigger } = useOptimisticStockUpdate();
 * await trigger({ menuId, stockQty: 50 });
 */
export function useOptimisticStockUpdate() {
  return useSWRMutation(
    '/api/merchant/menu/stock',
    async (url, { arg }: { arg: { menuId: string; stockQty: number } }) => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(buildOrderApiUrl(`/api/merchant/menu/${arg.menuId}/stock`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stockQty: arg.stockQty }),
      });

      if (!res.ok) throw new Error('Failed to update stock');
      return res.json();
    },
    {
      // Optimistic UI for menu list
      onSuccess: (_data, _key, _config) => {
        // Revalidate menu list
        mutate('/api/merchant/menu');
      },
      rollbackOnError: true,
    }
  );
}

/**
 * Example: Optimistic Inline Edit
 * 
 * Usage:
 * const { trigger } = useOptimisticInlineEdit();
 * await trigger({ id: menuId, field: 'name', value: 'New Name' });
 */
export function useOptimisticInlineEdit() {
  const menusKey = '/api/merchant/menu';

  return useSWRMutation(
    menusKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (url, { arg }: { arg: { id: string; field: string; value: any } }) => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(buildOrderApiUrl(`/api/merchant/menu/${arg.id}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [arg.field]: arg.value }),
      });

      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    {
      // Optimistic inline edit
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      optimisticData: (currentData: any, { arg }: { arg: { id: string; field: string; value: any } }) => {
        if (!currentData?.data) return currentData;

        return {
          ...currentData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: currentData.data.map((item: any) =>
            item.id === arg.id
              ? { ...item, [arg.field]: arg.value }
              : item
          ),
        };
      },
      populateCache: (result, currentData) => {
        // Update with server response
        if (!currentData?.data) return currentData;

        return {
          ...currentData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: currentData.data.map((item: any) =>
            item.id === result.data.id ? result.data : item
          ),
        };
      },
      revalidate: false, // Don't refetch, trust the server response
      rollbackOnError: true,
    }
  );
}

/**
 * Utility: Global Revalidation
 * Manually revalidate all data or specific keys
 */
export async function revalidateAll() {
  // Revalidate all cached keys
  await mutate(() => true);
}

export async function revalidateKey(key: string) {
  await mutate(key);
}

/**
 * Pattern: Prefetch Data
 * Prefetch data before navigation
 */
export async function prefetchData(url: string) {
  const token = localStorage.getItem('accessToken');

  await mutate(
    url,
    fetch(buildOrderApiUrl(url), {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    }).then(res => res.json()),
    { revalidate: false }
  );
}
