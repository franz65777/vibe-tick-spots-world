import React, { useRef, useState, useEffect } from 'react';
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

// Languages that use 12-hour clock format (AM/PM)
const TWELVE_HOUR_LANGUAGES = ['en', 'fil', 'tl']; // English, Filipino, Tagalog

// Convert 24h time to 12h format
const convert24hTo12h = (time24: string): string => {
  return time24.replace(/(\d{1,2}):(\d{2})/g, (_match, h, m) => {
    let hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${hour}:${m} ${period}`;
  });
};

// Format hours string based on current language (12h vs 24h)
const formatTodayHoursForLocale = (todayHours: string | null, language: string): string | null => {
  if (!todayHours) return null;

  const lang = language.toLowerCase().split('-')[0]; // Get base language code
  const uses12HourClock = TWELVE_HOUR_LANGUAGES.includes(lang);

  if (uses12HourClock) {
    // Check if already has AM/PM
    if (/(am|pm)/i.test(todayHours)) {
      return todayHours;
    }
    // Convert 24h format to 12h format for English users
    return convert24hTo12h(todayHours);
  }

  // For 24h languages, convert any 12h times to 24h
  let result = todayHours.replace(
    /(\d{1,2}(?::\d{2})?)\s*[–-]\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)\b/gi,
    (_m, start, end, period) => {
      const hasPeriodInStart = /(am|pm)/i.test(String(start));
      const startWithPeriod = hasPeriodInStart ? String(start) : `${String(start)} ${String(period)}`;
      return `${startWithPeriod} – ${String(end)} ${String(period)}`;
    }
  );

  // Convert any 12h times to 24h
  result = result.replace(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/gi, (_match, h, m, period) => {
    let hour = parseInt(h, 10);
    const minutes = m || '00';
    const upper = (period as string).toUpperCase();

    if (upper === 'PM' && hour < 12) hour += 12;
    if (upper === 'AM' && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  });

  return result;
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

  // All hooks must be called before any conditional returns
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  const formattedHours = formatTodayHoursForLocale(todayHours, i18n.language || 'en');
  const dayKey = dayIndexToKey[dayIndex] || 'monday';
  const translatedDayName = t(`days.${dayKey}`, { defaultValue: dayKey.charAt(0).toUpperCase() + dayKey.slice(1) });

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current && containerRef.current) {
        const overflow = Math.max(0, textRef.current.scrollWidth - containerRef.current.clientWidth);
        setIsTruncated(overflow > 0);
        textRef.current.style.setProperty('--marquee-distance', `${overflow}px`);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [formattedHours]);

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
        <>
          <span className="text-muted-foreground flex-shrink-0">
            {translatedDayName}:
          </span>
          <span
            ref={containerRef}
            className="text-muted-foreground overflow-hidden flex-1 min-w-0"
          >
            <span
              ref={textRef}
              className={cn(
                "inline-block whitespace-nowrap",
                isTruncated && "animate-marquee"
              )}
            >
              {formattedHours}
            </span>
          </span>
        </>
      )}
    </div>
  );
};
