export function getOrderApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_ORDER_API_BASE_URL?.replace(/\/$/, '') || '';
}

export function getOrderWsBaseUrl(): string {
  return process.env.NEXT_PUBLIC_ORDER_WS_URL?.replace(/\/$/, '') || '';
}

export function buildOrderApiUrl(path: string): string {
  const base = getOrderApiBaseUrl();
  if (!base) return path;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${path}`;
}
