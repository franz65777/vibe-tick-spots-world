import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geocodeSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationId: z.string().uuid().optional(),
  batchMode: z.boolean().optional().default(false),
  language: z.string().min(2).max(10).optional()
});

/**
 * FREE Reverse Geocoding with resilient networking
 * Primary: OpenStreetMap Nominatim (free)
 * Fallback: BigDataCloud (free, no key)
 */

type GeocodeResponse = {
  city: string;
  formatted_address: string;
  provider: 'nominatim-free' | 'bigdatacloud-free';
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3, backoffMs = 700) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
      // Backoff then retry (helps with transient network failures)
      await sleep(backoffMs * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Network error');
}

async function reverseGeocodeNominatim(lat: number, lng: number, language = 'en'): Promise<{ city: string; formatted_address: string; }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=${encodeURIComponent(language)}`;

  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'SpottApp/1.0 (+https://spott.app) contact: support@spott.app',
      'Accept': 'application/json',
      'Referer': 'https://spott.app',
    },
  });

  const data = await response.json();
  const addr = data.address || {};

  let city: string = addr.city || addr.town || addr.village || '';
  if (city) {
    city = city.replace(/\s+\d+$/, '').replace(/^County\s+/i, '').trim();

    const dublinNeighborhoods = [
      'rathmines', 'ranelagh', 'ballsbridge', 'donnybrook', 'sandymount',
      'ringsend', 'drumcondra', 'glasnevin', 'stoneybatter', 'smithfield',
      'tallaght', 'clondalkin', 'blanchardstown', 'swords', 'malahide',
      'dun laoghaire', 'blackrock', 'dundrum', 'clontarf', 'howth'
    ];
    if (dublinNeighborhoods.includes(city.toLowerCase())) city = 'Dublin';
  }

  const parts: string[] = [];
  if (addr.road) {
    let streetPart = addr.road;
    if (addr.house_number) streetPart = `${addr.road} ${addr.house_number}`;
    parts.push(streetPart);
  }
  if (city) parts.push(city);

  const formatted_address = parts.join(', ') || data.display_name || '';
  return { city, formatted_address };
}

async function reverseGeocodeBigDataCloud(lat: number, lng: number, language = 'en'): Promise<{ city: string; formatted_address: string; }> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${encodeURIComponent(language)}`;
  const res = await fetchWithRetry(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json();
  const city: string = data.city || data.locality || data.principalSubdivision || '';
  const parts: string[] = [];
  if (data.locality || data.city) parts.push(data.locality || data.city);
  if (city && !parts.includes(city)) parts.push(city);
  const formatted_address = parts.join(', ').trim();
  return { city, formatted_address };
}

async function reverseGeocodeWithFallback(lat: number, lng: number, language = 'en'): Promise<GeocodeResponse> {
  // Try Nominatim first
  try {
    const { city, formatted_address } = await reverseGeocodeNominatim(lat, lng, language);
    if (city || formatted_address) return { city, formatted_address, provider: 'nominatim-free' };
  } catch (err) {
    console.error('Nominatim failed, attempting fallback:', err);
  }

  // Fallback: BigDataCloud
  try {
    const { city, formatted_address } = await reverseGeocodeBigDataCloud(lat, lng, language);
    return { city, formatted_address, provider: 'bigdatacloud-free' };
  } catch (err) {
    console.error('BigDataCloud fallback failed:', err);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validation = geocodeSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input', 
        details: validation.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

const { latitude, longitude, locationId, batchMode, language } = validation.data;
const lang = language || 'en';

    if (batchMode) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data: locations } = await supabase
        .from('locations')
        .select('id, latitude, longitude, city, name')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(50);

      console.log(`💰 FREE: Processing ${locations?.length || 0} locations (saving ~$${((locations?.length || 0) * 5 / 1000).toFixed(2)})`);

      let updated = 0;

      for (const loc of locations || []) {
        if (loc.city && loc.city.length > 2) continue;

        try {
          const result = await reverseGeocodeWithFallback(loc.latitude, loc.longitude, lang);
          
          if (result.city) {
            const updates: any = { city: result.city };
            if (result.formatted_address) {
              updates.address = result.formatted_address;
            }
            
            await supabase.from('locations').update(updates).eq('id', loc.id);
            console.log(`✅ ${loc.name} → ${result.city}, ${result.formatted_address}`);
            updated++;
          }

          await new Promise(r => setTimeout(r, 1000)); // Rate limit
        } catch (err) {
          console.error(`Error: ${loc.id}`, err);
        }
      }

      return new Response(
        JSON.stringify({ success: true, updated }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single mode
    const result = await reverseGeocodeWithFallback(latitude, longitude, lang);

    if (locationId && result.city) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const updates: any = { city: result.city };
      if (result.formatted_address) {
        updates.address = result.formatted_address;
      }

      await supabase.from('locations').update(updates).eq('id', locationId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        city: result.city,
        formatted_address: result.formatted_address,
        provider: result.provider 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Reverse geocode error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
