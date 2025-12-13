import React from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { cn } from '@/lib/utils';

interface OpeningHoursDisplayProps {
  coordinates: { lat: number; lng: number } | null | undefined;
  placeName?: string;
  locationId?: string;
  googlePlaceId?: string | null;
  className?: string;
}

// Day name translations
const getDayName = (dayName: string, t: (key: string, options?: any) => string): string => {
  const dayKey = dayName.toLowerCase();
  return t(`days.${dayKey}`, { defaultValue: dayName }) as string;
};

// Format hours string based on current language (12h vs 24h)
const formatTodayHoursForLocale = (todayHours: string | null, language: string): string | null => {
  if (!todayHours) return null;

  const lang = language.toLowerCase();
  const uses12HourClock = lang.startsWith('en'); // English uses 12h, others 24h

  if (uses12HourClock) {
    return todayHours;
  }

  // For non-English languages, convert "9:00 AM – 4:00 PM" style to 24h.
  if (!/(am|pm)/i.test(todayHours)) {
    return todayHours;
  }

  return todayHours.replace(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi, (_match, h, m, period) => {
    let hour = parseInt(h, 10);
    const minutes = m as string;
    const upper = (period as string).toUpperCase();

    if (upper === 'PM' && hour < 12) hour += 12;
    if (upper === 'AM' && hour === 12) hour = 0;

    const hourStr = hour.toString().padStart(2, '0');
    return `${hourStr}:${minutes}`;
  });
};

export const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({
  coordinates,
  placeName,
  locationId,
  googlePlaceId,
  className
}) => {
  const { t, i18n } = useTranslation();
  
  const {
    isOpen,
    todayHours,
    dayName,
    loading
  } = useOpeningHours({
    coordinates,
    placeName,
    locationId,
    googlePlaceId: googlePlaceId || undefined
  });

  const formattedHours = formatTodayHoursForLocale(todayHours, i18n.language || 'en');

  // Show "Hours not available" if we couldn't get hours
  if (loading) {
    return null;
  }

  // No opening hours data available
  if (isOpen === null && !todayHours) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground">
          {t('openingHours.notAvailable', { defaultValue: 'Hours not available' })}
        </span>
      </div>
    );
  }

  const translatedDayName = getDayName(dayName, t);
  
  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <span className={cn(
        "font-medium flex-shrink-0",
        isOpen ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
      )}>
        {isOpen ? t('openingHours.open') : t('openingHours.closed')}
      </span>
      
      {formattedHours && (
        <span className="text-muted-foreground truncate">
          {translatedDayName}: {formattedHours}
        </span>
      )}
    </div>
  );
};
