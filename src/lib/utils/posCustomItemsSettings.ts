export interface PosCustomItemsSettings {
  enabled: boolean;
  maxNameLength: number;
  maxPrice: number;
}

export interface PosEditOrderSettings {
  enabled: boolean;
}

const DEFAULT_MAX_NAME_LENGTH = 80;
const DEFAULT_MAX_PRICE_BY_CURRENCY: Record<string, number> = {
  IDR: 10_000_000,
  AUD: 5_000,
  USD: 5_000,
  SGD: 5_000,
  MYR: 10_000,
};

function defaultMaxPrice(currency: string | null | undefined): number {
  const key = (currency || '').toUpperCase();
  return DEFAULT_MAX_PRICE_BY_CURRENCY[key] ?? 10_000_000;
}

export function getPosCustomItemsSettings(params: {
  features: unknown;
  currency?: string | null;
}): PosCustomItemsSettings {
  const features = (params.features || {}) as any;
  const custom = (features?.pos?.customItems || {}) as any;

  // Null/undefined => OFF (explicit opt-in)
  const enabled = custom?.enabled === true;

  const maxNameLengthRaw = Number(custom?.maxNameLength);
  const maxNameLength = Number.isFinite(maxNameLengthRaw) && maxNameLengthRaw > 0
    ? Math.floor(maxNameLengthRaw)
    : DEFAULT_MAX_NAME_LENGTH;

  const maxPriceRaw = Number(custom?.maxPrice);
  const maxPrice = Number.isFinite(maxPriceRaw) && maxPriceRaw > 0
    ? maxPriceRaw
    : defaultMaxPrice(params.currency);

  return {
    enabled,
    maxNameLength,
    maxPrice,
  };
}

export function getPosEditOrderSettings(params: {
  features: unknown;
}): PosEditOrderSettings {
  const features = (params.features || {}) as any;
  const editOrder = (features?.pos?.editOrder || {}) as any;

  return {
    enabled: editOrder?.enabled === true,
  };
}
