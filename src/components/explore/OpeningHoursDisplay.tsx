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
  cachedOpeningHours?: any;
  className?: string;
}

// Map day index (0=Sunday) to translation key
const dayIndexToKey: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
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
  cachedOpeningHours,
  className
}) => {
  const { t, i18n } = useTranslation();
  
  const {
    isOpen,
    todayHours,
    dayIndex,
    loading
  } = useOpeningHours({
    coordinates,
    placeName,
    locationId,
    googlePlaceId: googlePlaceId || undefined,
    cachedOpeningHours
  });

  const formattedHours = formatTodayHoursForLocale(todayHours, i18n.language || 'en');

  // Show nothing while loading
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

  // Get translated day name using dayIndex
  const dayKey = dayIndexToKey[dayIndex] || 'monday';
  const translatedDayName = t(`days.${dayKey}`, { defaultValue: dayKey.charAt(0).toUpperCase() + dayKey.slice(1) });
  
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
