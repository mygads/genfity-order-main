export async function register() {
  const apiBase = process.env.NEXT_PUBLIC_ORDER_API_BASE_URL?.trim();
  const wsBase = process.env.NEXT_PUBLIC_ORDER_WS_URL?.trim();

  const apiMode = apiBase ? `Go order API (${apiBase})` : 'Next.js API (local)';
  const wsMode = wsBase ? `Go order WS (${wsBase})` : 'Next.js (no WS override)';

  // Logs once per server process at startup (dev or production).
  // eslint-disable-next-line no-console
  console.info(`[order-api] ${apiMode}`);
  // eslint-disable-next-line no-console
  console.info(`[order-ws] ${wsMode}`);
}
