import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse OSM opening_hours format to structured data
function parseOsmHours(hoursString: string): { isOpen: boolean; todayHours: string | null } | null {
  if (!hoursString) return null;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // Day abbreviations mapping (OSM uses Mo, Tu, We, etc.)
  const dayAbbrevToNum: Record<string, number> = {
    'su': 0, 'mo': 1, 'tu': 2, 'we': 3, 'th': 4, 'fr': 5, 'sa': 6
  };

  // Handle 24/7
  if (hoursString.toLowerCase().includes('24/7')) {
    return { isOpen: true, todayHours: '00:00 – 23:59' };
  }

  try {
    const rules = hoursString.toLowerCase().split(';').map(r => r.trim());
    const dayHours: Map<number, { open: number; close: number }[]> = new Map();

    for (const rule of rules) {
      if (!rule || rule.includes('off') || rule.includes('closed')) continue;

      // Match patterns like "Mo-Fr 09:00-18:00" or "Sa 09:00-14:00"
      const match = rule.match(/^([a-z,\-\s]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      
      if (match) {
        const [, daysPart, openTime, closeTime] = match;
        
        // Parse time to minutes
        const parseTime = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        
        const openMinutes = parseTime(openTime);
        const closeMinutes = parseTime(closeTime);
        
        // Parse days
        const dayRanges = daysPart.split(',').map(d => d.trim());
        for (const dayRange of dayRanges) {
          if (dayRange.includes('-')) {
            const [start, end] = dayRange.split('-').map(d => d.trim());
            const startNum = dayAbbrevToNum[start];
            const endNum = dayAbbrevToNum[end];
            
            if (startNum !== undefined && endNum !== undefined) {
              let current = startNum;
              const visited = new Set<number>();
              while (!visited.has(current)) {
                visited.add(current);
                const existing = dayHours.get(current) || [];
                existing.push({ open: openMinutes, close: closeMinutes });
                dayHours.set(current, existing);
                if (current === endNum) break;
                current = (current + 1) % 7;
              }
            }
          } else {
            const dayNum = dayAbbrevToNum[dayRange];
            if (dayNum !== undefined) {
              const existing = dayHours.get(dayNum) || [];
              existing.push({ open: openMinutes, close: closeMinutes });
              dayHours.set(dayNum, existing);
            }
          }
        }
      }
    }

    // Get today's hours
    const todayPeriods = dayHours.get(currentDay);
    
    if (!todayPeriods || todayPeriods.length === 0) {
      return { isOpen: false, todayHours: null };
    }

    // Format today's hours
    const formatMinutes = (m: number) => {
      const hours = Math.floor(m / 60);
      const mins = m % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const todayHoursStr = todayPeriods
      .map(p => `${formatMinutes(p.open)} – ${formatMinutes(p.close)}`)
      .join(', ');

    // Check if currently open
    let isOpen = false;
    for (const period of todayPeriods) {
      // Handle overnight (close < open means closes next day)
      if (period.close < period.open) {
        if (currentTime >= period.open || currentTime < period.close) {
          isOpen = true;
          break;
        }
      } else {
        if (currentTime >= period.open && currentTime < period.close) {
          isOpen = true;
          break;
        }
      }
    }

    return { isOpen, todayHours: todayHoursStr };
  } catch (e) {
    console.error('Error parsing OSM hours:', e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lng, name } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ openingHours: null, error: 'Coordinates required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for place: ${name} at ${lat}, ${lng}`);

    // Use OpenStreetMap Overpass API (completely free, unlimited)
    const radius = 50; // meters
    const nameFilter = name 
      ? `["name"~"${name.replace(/['"\[\]]/g, '').substring(0, 30)}",i]` 
      : '';
    
    const query = `
      [out:json][timeout:10];
      (
        node["opening_hours"]${nameFilter}(around:${radius},${lat},${lng});
        way["opening_hours"]${nameFilter}(around:${radius},${lat},${lng});
        node["opening_hours"](around:${radius},${lat},${lng});
        way["opening_hours"](around:${radius},${lat},${lng});
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
      console.error('Overpass API error:', response.status);
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log(`Found ${result.elements?.length || 0} OSM elements`);
    
    if (!result.elements || result.elements.length === 0) {
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find best match by name
    let bestMatch = result.elements[0];
    if (name) {
      const normalizedName = name.toLowerCase().trim();
      
      // Try exact match first
      const exactMatch = result.elements.find((el: any) => 
        el.tags?.name?.toLowerCase().trim() === normalizedName
      );
      
      if (exactMatch) {
        bestMatch = exactMatch;
      } else {
        // Try partial match
        const partialMatch = result.elements.find((el: any) => {
          const osmName = el.tags?.name?.toLowerCase() || '';
          return osmName.includes(normalizedName) || normalizedName.includes(osmName);
        });
        if (partialMatch) {
          bestMatch = partialMatch;
        }
      }
    }

    const hoursString = bestMatch.tags?.opening_hours;
    console.log(`Best match: ${bestMatch.tags?.name || 'unnamed'}, hours: ${hoursString}`);
    
    if (!hoursString) {
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = parseOsmHours(hoursString);
    
    if (!parsed) {
      return new Response(
        JSON.stringify({ openingHours: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Result: isOpen=${parsed.isOpen}, todayHours=${parsed.todayHours}`);

    return new Response(
      JSON.stringify({
        openingHours: {
          isOpen: parsed.isOpen,
          todayHours: parsed.todayHours
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching place hours:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
