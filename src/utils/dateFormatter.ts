import { TFunction } from 'i18next';

/**
 * Formats post dates based on age:
 * - Less than 4 weeks: relative time (e.g., "2h ago", "3d ago")
 * - 4 weeks to 1 year: day and month (e.g., "14 September")
 * - Over 1 year or different year: day, month and year (e.g., "14 January 2024")
 */
export function formatPostDate(dateString: string, t: TFunction): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  
  // Less than 4 weeks old - show relative time
  if (diffWeeks < 4) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    
    if (diffMinutes < 60) {
      return t('minutesShort', { ns: 'common', count: diffMinutes });
    } else if (diffHours < 24) {
      return t('hoursShort', { ns: 'common', count: diffHours });
    } else if (diffDays < 7) {
      return t('daysShort', { ns: 'common', count: diffDays });
    } else {
      return t('weeksShort', { ns: 'common', count: diffWeeks });
    }
  }
  
  // 4+ weeks old - show formatted date
  const day = date.getDate();
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  const currentYear = now.getFullYear();
  
  const monthName = t(`months.${month}`, { ns: 'common' });
  
  // Different year - include year
  if (year !== currentYear) {
    return `${day} ${monthName} ${year}`;
  }
  
  // Same year but 4+ weeks old
  return `${day} ${monthName}`;
}
