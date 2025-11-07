import { Locale } from 'date-fns';
import { it, es, pt, fr, de, ja, ko, ar, hi, ru, zhCN, enUS } from 'date-fns/locale';

// Mappa dei locale di date-fns per tutte le lingue supportate
export const dateFnsLocaleMap: Record<string, Locale> = {
  en: enUS,
  it,
  es,
  pt,
  fr,
  de,
  ja,
  ko,
  ar,
  hi,
  ru,
  zh: zhCN,
};

/**
 * Ottiene il locale date-fns corretto per la lingua specificata
 * @param languageCode - Codice lingua (es: 'en', 'it', 'es')
 * @returns Locale di date-fns corrispondente
 */
export function getDateFnsLocale(languageCode: string): Locale | undefined {
  return dateFnsLocaleMap[languageCode] || dateFnsLocaleMap.en;
}
