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
  batchMode: z.boolean().optional().default(false)
});

/**
 * FREE Reverse Geocoding using OpenStreetMap Nominatim
 * Cost: $0 (was ~$5/1000 with Google Maps Geocoding API)
 */
async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`;
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SpottApp/1.0' },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = await response.json();

  let city = data.address?.city || data.address?.town || data.address?.village || '';

  if (city) {
    city = city.replace(/\s+\d+$/, '').replace(/^County\s+/i, '').trim();
    
    const dublinNeighborhoods = [
      'rathmines', 'ranelagh', 'ballsbridge', 'donnybrook', 'sandymount',
      'ringsend', 'drumcondra', 'glasnevin', 'stoneybatter', 'smithfield',
      'tallaght', 'clondalkin', 'blanchardstown', 'swords', 'malahide',
      'dun laoghaire', 'blackrock', 'dundrum', 'clontarf', 'howth'
    ];
    
    if (dublinNeighborhoods.includes(city.toLowerCase())) {
      city = 'Dublin';
    }
  }

  return city;
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

    const { latitude, longitude, locationId, batchMode } = validation.data;

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
          const city = await reverseGeocodeNominatim(loc.latitude, loc.longitude);
          
          if (city) {
            await supabase.from('locations').update({ city }).eq('id', loc.id);
            console.log(`✅ ${loc.name} → ${city}`);
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
    const city = await reverseGeocodeNominatim(latitude, longitude);

    if (locationId && city) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabase.from('locations').update({ city }).eq('id', locationId);
    }

    return new Response(
      JSON.stringify({ success: true, city, provider: 'nominatim-free' }),
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
