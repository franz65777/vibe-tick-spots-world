import React, { useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { cn } from '@/lib/utils';

interface OpeningHoursDisplayProps {
  coordinates: { lat: number; lng: number } | null | undefined;
  placeName?: string;
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
  className
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  
  const {
    isOpen,
    todayHours,
    closingTime,
    openingTime,
    dayName,
    loading
  } = useOpeningHours(coordinates, placeName);

  // Don't show anything if we couldn't get hours or still loading
  if (loading || isOpen === null) {
    return null;
  }

  const translatedDayName = getDayName(dayName, t);
  
  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={cn(
        "flex items-center gap-2 text-sm transition-colors hover:opacity-80",
        className
      )}
    >
      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      <span className={cn(
        "font-medium",
        isOpen ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
      )}>
        {isOpen ? t('openingHours.open') : t('openingHours.closed')}
      </span>
      
      {todayHours && (
        <span className="text-muted-foreground">
          {translatedDayName}: {todayHours}
        </span>
      )}
      
      {!isOpen && openingTime && (
        <span className="text-muted-foreground">
          · {t('openingHours.opensAt', { time: openingTime })}
        </span>
      )}
      
      {isOpen && closingTime && (
        <span className="text-muted-foreground">
          · {t('openingHours.closesAt', { time: closingTime })}
        </span>
      )}
      
      <ChevronDown className={cn(
        "w-3.5 h-3.5 text-muted-foreground transition-transform",
        expanded && "rotate-180"
      )} />
    </button>
  );
};
