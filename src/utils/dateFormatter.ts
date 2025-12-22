import { TFunction } from 'i18next';

const LOCALE_MAP: Record<string, string> = {
  'en': 'en-US',
  'it': 'it-IT',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'pt': 'pt-BR',
  'zh': 'zh-CN',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'ar': 'ar-SA',
  'hi': 'hi-IN',
  'ru': 'ru-RU',
  'tr': 'tr-TR',
};

/**
 * Formats post dates based on age:
 * - Less than 4 weeks: relative time (e.g., "2h ago", "3d ago")
 * - 4 weeks to 1 year: day and month (e.g., "14 September")
 * - Over 1 year or different year: day, month and year (e.g., "14 January 2024")
 * 
 * @param dateString - ISO date string
 * @param t - i18next translation function (used to get current language)
 * @param language - Optional language override (defaults to t's i18n.language)
 */
export function formatPostDate(dateString: string, t: TFunction, language?: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  
  // Get current language from t function's i18n context or fallback
  const lang = language || (t as any).i18n?.language || 'en';
  const locale = LOCALE_MAP[lang] || lang;
  
  // Less than 4 weeks old - show relative time
  if (diffWeeks < 4) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffMinutes < 60) {
      return t('minutesShort', { ns: 'common', count: diffMinutes, defaultValue: '{{count}}m' });
    } else if (diffHours < 24) {
      return t('hoursShort', { ns: 'common', count: diffHours, defaultValue: '{{count}}h' });
    } else if (diffDays < 7) {
      return t('daysShort', { ns: 'common', count: diffDays, defaultValue: '{{count}}d' });
    } else {
      return t('weeksShort', { ns: 'common', count: diffWeeks, defaultValue: '{{count}}w' });
    }
  }
  
  // 4+ weeks old - show formatted date using browser's Intl API for proper localization
  const day = date.getDate();
  const year = date.getFullYear();
  const currentYear = now.getFullYear();
  const monthName = date.toLocaleString(locale, { month: 'long' });
  
  // Different year - include year
  if (year !== currentYear) {
    return `${day} ${monthName} ${year}`;
  }
  
  // Same year but 4+ weeks old
  return `${day} ${monthName}`;
}
