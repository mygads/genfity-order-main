import useSWR from 'swr';

import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';

export type MerchantReservationCounts = {
  pending: number;
  active: number;
};

type Options = {
  enabled?: boolean;
  refreshInterval?: number;
  dedupingInterval?: number;
};

export function useMerchantReservationCounts(options?: Options) {
  const enabled = options?.enabled ?? true;
  const refreshInterval = options?.refreshInterval ?? 60_000;
  const dedupingInterval = options?.dedupingInterval ?? 10_000;

  const key =
    typeof window === 'undefined'
      ? null
      : enabled
        ? buildOrderApiUrl('/api/merchant/reservations/count')
        : null;

  const fetcher = async (url: string): Promise<MerchantReservationCounts> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return { pending: 0, active: 0 };

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return { pending: 0, active: 0 };
      }

      const json = await res.json();
      const pending = Number(json?.data?.pending ?? 0);
      const active = Number(json?.data?.active ?? 0);

      return {
        pending: Number.isFinite(pending) ? pending : 0,
        active: Number.isFinite(active) ? active : 0,
      };
    } catch {
      return { pending: 0, active: 0 };
    }
  };

  return useSWR<MerchantReservationCounts>(key, fetcher, {
    refreshInterval,
    dedupingInterval,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}
