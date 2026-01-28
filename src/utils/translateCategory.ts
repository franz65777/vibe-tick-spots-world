import type { TFunction } from 'i18next';

import { normalizeCategoryToBase } from '@/utils/normalizeCategoryToBase';

/**
 * Translate a location category using the `common.categories.*` keys.
 * Falls back to the original category label when no translation exists.
 */
export function translateCategory(category: unknown, t: TFunction): string {
  const raw = String(category ?? '').trim();
  if (!raw) return '';

  const key =
    normalizeCategoryToBase(raw) ??
    String(raw).trim().toLowerCase();

  if (!key) return raw;

  const translated = t(`categories.${key}`, { ns: 'common' });

  // If translation equals the key path, it means translation wasn't found
  if (translated === `categories.${key}`) return raw;

  return translated;
}
