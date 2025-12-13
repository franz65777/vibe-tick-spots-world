import { useState, useEffect } from 'react';

interface OpeningHoursData {
  isOpen: boolean | null;
  todayHours: string | null;
  closingTime: string | null;
  openingTime: string | null;
  dayName: string;
  loading: boolean;
  error: string | null;
}

interface DayHours {
  open: string;
  close: string;
}

// Parse OSM opening_hours format
const parseOpeningHours = (openingHoursString: string): Map<number, DayHours[]> => {
  const dayMap = new Map<number, DayHours[]>();
  
  if (!openingHoursString) return dayMap;

  // Day abbreviations to day numbers (0 = Sunday, 1 = Monday, etc.)
  const dayAbbrevToNum: Record<string, number> = {
    'su': 0, 'mo': 1, 'tu': 2, 'we': 3, 'th': 4, 'fr': 5, 'sa': 6
  };

  try {
    // Handle "24/7" format
    if (openingHoursString.toLowerCase().includes('24/7')) {
      for (let i = 0; i < 7; i++) {
        dayMap.set(i, [{ open: '00:00', close: '23:59' }]);
      }
      return dayMap;
    }

    // Simple parser for common formats like "Mo-Fr 09:00-18:00; Sa 09:00-14:00"
    const rules = openingHoursString.toLowerCase().split(';').map(r => r.trim());
    
    for (const rule of rules) {
      if (!rule) continue;
      
      // Handle "off" days
      if (rule.includes('off') || rule.includes('closed')) continue;
      
      // Match patterns like "Mo-Fr 09:00-18:00" or "Sa 09:00-14:00" or "Mo,Tu,We 08:00-20:00"
      const match = rule.match(/^([a-z,\-\s]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      
      if (match) {
        const [, daysPart, openTime, closeTime] = match;
        const days: number[] = [];
        
        // Parse days
        const dayRanges = daysPart.split(',').map(d => d.trim());
        for (const dayRange of dayRanges) {
          if (dayRange.includes('-')) {
            const [start, end] = dayRange.split('-').map(d => d.trim());
            const startNum = dayAbbrevToNum[start];
            const endNum = dayAbbrevToNum[end];
            
            if (startNum !== undefined && endNum !== undefined) {
              let current = startNum;
              while (current !== endNum) {
                days.push(current);
                current = (current + 1) % 7;
              }
              days.push(endNum);
            }
          } else {
            const dayNum = dayAbbrevToNum[dayRange];
            if (dayNum !== undefined) {
              days.push(dayNum);
            }
          }
        }
        
        // Normalize time format
        const normalizeTime = (time: string) => {
          const [h, m] = time.split(':');
          return `${h.padStart(2, '0')}:${m}`;
        };
        
        // Add hours to each day
        for (const day of days) {
          const existing = dayMap.get(day) || [];
          existing.push({ open: normalizeTime(openTime), close: normalizeTime(closeTime) });
          dayMap.set(day, existing);
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse opening hours:', e);
  }
  
  return dayMap;
};

// Convert 24h time to 12h format
const formatTime = (time24: string, use24h: boolean = true): string => {
  if (use24h) return time24;
  
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Check if currently open based on hours
const isCurrentlyOpen = (hoursMap: Map<number, DayHours[]>): { isOpen: boolean; closingTime: string | null; openingTime: string | null } => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const todayHours = hoursMap.get(currentDay);
  
  if (!todayHours || todayHours.length === 0) {
    // Check next opening time
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7;
      const nextDayHours = hoursMap.get(nextDay);
      if (nextDayHours && nextDayHours.length > 0) {
        return { isOpen: false, closingTime: null, openingTime: nextDayHours[0].open };
      }
    }
    return { isOpen: false, closingTime: null, openingTime: null };
  }
  
  for (const period of todayHours) {
    if (currentTime >= period.open && currentTime <= period.close) {
      return { isOpen: true, closingTime: period.close, openingTime: null };
    }
  }
  
  // Check if it will open later today
  for (const period of todayHours) {
    if (currentTime < period.open) {
      return { isOpen: false, closingTime: null, openingTime: period.open };
    }
  }
  
  return { isOpen: false, closingTime: null, openingTime: null };
};

export const useOpeningHours = (
  coordinates: { lat: number; lng: number } | null | undefined,
  placeName?: string,
  googlePlaceId?: string | null
): OpeningHoursData => {
  const [data, setData] = useState<OpeningHoursData>({
    isOpen: null,
    todayHours: null,
    closingTime: null,
    openingTime: null,
    dayName: '',
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!coordinates?.lat || !coordinates?.lng) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchOpeningHours = async () => {
      try {
        // Use Overpass API to get opening hours from OSM with larger radius and better matching
        const radius = 100; // 100 meters radius for better matching
        
        // Create a query that prioritizes exact name matches
        const nameFilter = placeName 
          ? `["name"~"${placeName.replace(/['"]/g, '').substring(0, 30)}",i]` 
          : '';
        
        const query = `
          [out:json][timeout:10];
          (
            node["opening_hours"]${nameFilter}(around:${radius},${coordinates.lat},${coordinates.lng});
            way["opening_hours"]${nameFilter}(around:${radius},${coordinates.lat},${coordinates.lng});
            node["opening_hours"](around:${radius},${coordinates.lat},${coordinates.lng});
            way["opening_hours"](around:${radius},${coordinates.lat},${coordinates.lng});
          );
          out tags;
        `;
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch opening hours');
        }

        const result = await response.json();
        
        // Find best match by name if provided
        let bestMatch = null;
        
        if (placeName && result.elements?.length > 0) {
          const normalizedPlaceName = placeName.toLowerCase().trim();
          
          // First try exact match
          bestMatch = result.elements.find((el: any) => 
            el.tags?.name?.toLowerCase().trim() === normalizedPlaceName
          );
          
          // Then try partial match
          if (!bestMatch) {
            bestMatch = result.elements.find((el: any) => {
              const name = el.tags?.name?.toLowerCase() || '';
              return name.includes(normalizedPlaceName) || normalizedPlaceName.includes(name);
            });
          }
          
          // Fallback to first result
          if (!bestMatch) {
            bestMatch = result.elements[0];
          }
        } else if (result.elements?.length > 0) {
          bestMatch = result.elements[0];
        }

        const openingHoursString = bestMatch?.tags?.opening_hours;
        
        if (!openingHoursString) {
          setData({
            isOpen: null,
            todayHours: null,
            closingTime: null,
            openingTime: null,
            dayName: '',
            loading: false,
            error: null
          });
          return;
        }

        const hoursMap = parseOpeningHours(openingHoursString);
        const now = new Date();
        const currentDay = now.getDay();
        
        // Get day name
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = dayNames[currentDay];
        
        // Get today's hours string
        const todayHoursData = hoursMap.get(currentDay);
        let todayHoursStr = null;
        
        if (todayHoursData && todayHoursData.length > 0) {
          todayHoursStr = todayHoursData
            .map(h => `${formatTime(h.open)} – ${formatTime(h.close)}`)
            .join(', ');
        }

        const { isOpen, closingTime, openingTime } = isCurrentlyOpen(hoursMap);
        
        setData({
          isOpen,
          todayHours: todayHoursStr,
          closingTime: closingTime ? formatTime(closingTime) : null,
          openingTime: openingTime ? formatTime(openingTime) : null,
          dayName,
          loading: false,
          error: null
        });
      } catch (error) {
        console.warn('Error fetching opening hours:', error);
        setData({
          isOpen: null,
          todayHours: null,
          closingTime: null,
          openingTime: null,
          dayName: '',
          loading: false,
          error: 'Failed to fetch opening hours'
        });
      }
    };

    fetchOpeningHours();
  }, [coordinates?.lat, coordinates?.lng, placeName, googlePlaceId]);

  return data;
};