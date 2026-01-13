import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(params: {
  token: string;
  ipAddress?: string;
}): Promise<void> {
  if (!isTurnstileEnabled()) return;

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;

  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', params.token);
  if (params.ipAddress) formData.append('remoteip', params.ipAddress);

  let verifyResponse: Response;
  try {
    verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: formData,
      }
    );
  } catch {
    throw new ValidationError(
      'Security verification failed',
      ERROR_CODES.VALIDATION_FAILED
    );
  }

  let json: TurnstileVerifyResponse | null = null;
  try {
    json = (await verifyResponse.json()) as TurnstileVerifyResponse;
  } catch {
    // ignore
  }

  if (!verifyResponse.ok || !json?.success) {
    throw new ValidationError(
      'Security verification failed',
      ERROR_CODES.VALIDATION_FAILED
    );
  }
}
