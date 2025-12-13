import React from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { cn } from '@/lib/utils';

interface OpeningHoursDisplayProps {
  coordinates: { lat: number; lng: number } | null | undefined;
  placeName?: string;
  googlePlaceId?: string | null;
  className?: string;
}

// Day name translations
const getDayName = (dayName: string, t: (key: string, options?: any) => string): string => {
  const dayKey = dayName.toLowerCase();
  return t(`days.${dayKey}`, { defaultValue: dayName }) as string;
};

export const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({
  coordinates,
  placeName,
  googlePlaceId,
  className
}) => {
  const { t } = useTranslation();
  
  const {
    isOpen,
    todayHours,
    closingTime,
    openingTime,
    dayName,
    loading
  } = useOpeningHours(coordinates, placeName, googlePlaceId);

  // Don't show anything if we couldn't get hours or still loading
  if (loading || isOpen === null) {
    return null;
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
      
      {todayHours && (
        <span className="text-muted-foreground truncate">
          {translatedDayName}: {todayHours}
        </span>
      )}
      
      {!isOpen && openingTime && !todayHours && (
        <span className="text-muted-foreground truncate">
          {t('openingHours.opensAt', { time: openingTime })}
        </span>
      )}
      
      {isOpen && closingTime && !todayHours && (
        <span className="text-muted-foreground truncate">
          {t('openingHours.closesAt', { time: closingTime })}
        </span>
      )}
    </div>
  );
};