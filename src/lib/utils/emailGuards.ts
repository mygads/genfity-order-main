export function isGuestLikeEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return true;

  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0) return true;

  const localPart = normalized.slice(0, atIndex);
  const domainPart = normalized.slice(atIndex + 1);

  const guestLocalPrefixes = ['guest', 'tamu', 'walkin', 'walk-in', 'walk_in'];
  const isGuestLocal = guestLocalPrefixes.some(prefix => {
    if (localPart === prefix) return true;
    if (new RegExp(`^${prefix}\\d+$`).test(localPart)) return true;
    return (
      localPart.startsWith(`${prefix}+`) ||
      localPart.startsWith(`${prefix}.`) ||
      localPart.startsWith(`${prefix}-`) ||
      localPart.startsWith(`${prefix}_`)
    );
  });

  if (isGuestLocal) return true;

  const blockedDomains = new Set([
    'guest.local',
    'guest.example',
    'example.com',
    'example.org',
    'example.net',
  ]);

  if (blockedDomains.has(domainPart)) return true;
  if (domainPart.startsWith('guest.')) return true;

  // Common internal placeholder patterns
  if (domainPart === 'genfity.com' && localPart.startsWith('guest')) return true;

  return false;
}

export function shouldSendCustomerEmail(email?: string | null): email is string {
  return !!email && !isGuestLikeEmail(email);
}
