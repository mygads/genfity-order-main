import { PERMISSION_GROUPS } from '@/lib/constants/permissions';
import { getTranslation, type Locale, type TranslationKeys } from '@/lib/i18n';

type PermissionMeta = {
  key: string;
  nameKey: TranslationKeys;
  descKey: TranslationKeys;
};

const permissionMetaByKey: Record<string, PermissionMeta> = Object.values(PERMISSION_GROUPS).reduce(
  (acc, group) => {
    for (const perm of group.permissions) {
      acc[perm.key] = {
        key: perm.key,
        nameKey: perm.nameKey as TranslationKeys,
        descKey: perm.descKey as TranslationKeys,
      };
    }
    return acc;
  },
  {} as Record<string, PermissionMeta>
);

function fallbackLabelFromKey(key: string): string {
  const normalized = key.includes('_')
    ? key
    : key.replace(/([a-z])([A-Z])/g, '$1_$2');

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getPermissionMeta(permissionKey: string): PermissionMeta | null {
  return permissionMetaByKey[permissionKey] ?? null;
}

export function getPermissionLabelForLocale(locale: Locale, permissionKey: string): string {
  const meta = getPermissionMeta(permissionKey);
  if (!meta) return fallbackLabelFromKey(permissionKey);
  return getTranslation(locale, meta.nameKey);
}

export function getPermissionDescriptionForLocale(locale: Locale, permissionKey: string): string {
  const meta = getPermissionMeta(permissionKey);
  if (!meta) return '';
  return getTranslation(locale, meta.descKey);
}

export function getPermissionLabelFromT(
  t: (key: TranslationKeys | string) => string,
  permissionKey: string
): string {
  const meta = getPermissionMeta(permissionKey);
  if (!meta) return fallbackLabelFromKey(permissionKey);
  const label = t(meta.nameKey);
  return label === String(meta.nameKey) ? fallbackLabelFromKey(permissionKey) : label;
}

export function getPermissionDescriptionFromT(
  t: (key: TranslationKeys | string) => string,
  permissionKey: string
): string {
  const meta = getPermissionMeta(permissionKey);
  if (!meta) return '';
  const desc = t(meta.descKey);
  return desc === String(meta.descKey) ? '' : desc;
}
