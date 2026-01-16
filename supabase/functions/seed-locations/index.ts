import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Target cities for seeding with their approximate coordinates
const TARGET_CITIES = [
  // Italia
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.1900 },
  { name: 'Naples', country: 'Italy', lat: 40.8518, lng: 14.2681 },
  { name: 'Florence', country: 'Italy', lat: 43.7696, lng: 11.2558 },
  { name: 'Venice', country: 'Italy', lat: 45.4408, lng: 12.3155 },
  { name: 'Bologna', country: 'Italy', lat: 44.4949, lng: 11.3426 },
  { name: 'Turin', country: 'Italy', lat: 45.0703, lng: 7.6869 },
  // Europa
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.5820 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  // USA
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
  { name: 'Miami', country: 'USA', lat: 25.7617, lng: -80.1918 },
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194 },
  { name: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298 },
  // Asia
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780 },
  // Sud America
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  // Oceania
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
];

// Categories to seed with Overpass amenity types
const CATEGORIES = [
  { name: 'restaurant', amenity: 'restaurant', limit: 12 },
  { name: 'cafe', amenity: 'cafe', limit: 10 },
  { name: 'bar', amenity: 'bar', limit: 8 },
  { name: 'hotel', amenity: 'hotel', limit: 6 },
  { name: 'museum', amenity: 'museum', limit: 5 },
  { name: 'park', amenity: 'park', limit: 4 },
  { name: 'nightclub', amenity: 'nightclub', limit: 4 },
  { name: 'bakery', amenity: 'bakery', limit: 4 },
];

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    'name:en'?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    cuisine?: string;
    opening_hours?: string;
    website?: string;
    phone?: string;
  };
}

// Utility to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Query Overpass with retry logic
async function queryOverpassWithRetry(
  city: typeof TARGET_CITIES[0], 
  category: typeof CATEGORIES[0],
  maxRetries = 3
): Promise<OverpassElement[]> {
  const radiusMeters = 5000; // 5km radius from city center
  
  const query = `
    [out:json][timeout:60];
    (
      node["amenity"="${category.amenity}"]["name"](around:${radiusMeters},${city.lat},${city.lng});
      way["amenity"="${category.amenity}"]["name"](around:${radiusMeters},${city.lat},${city.lng});
    );
    out center ${category.limit};
  `;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.status === 429 || response.status === 504 || response.status === 503) {
        // Rate limited or server overloaded - wait and retry
        const waitTime = Math.min(5000 * attempt, 15000);
        console.log(`Rate limited for ${city.name}/${category.name}, waiting ${waitTime}ms (attempt ${attempt})`);
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) {
        console.error(`Overpass API error for ${city.name}/${category.name}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      if (attempt < maxRetries) {
        const waitTime = Math.min(3000 * attempt, 10000);
        console.log(`Error for ${city.name}/${category.name}, retrying in ${waitTime}ms (attempt ${attempt})`);
        await sleep(waitTime);
      } else {
        console.error(`Failed after ${maxRetries} attempts for ${city.name}/${category.name}:`, error);
        return [];
      }
    }
  }
  return [];
}

function buildAddress(tags: OverpassElement['tags']): string | null {
  if (!tags) return null;
  
  const parts: string[] = [];
  if (tags['addr:street']) {
    let street = tags['addr:street'];
    if (tags['addr:housenumber']) {
      street += ' ' + tags['addr:housenumber'];
    }
    parts.push(street);
  }
  if (tags['addr:city']) {
    parts.push(tags['addr:city']);
  }
  if (tags['addr:postcode']) {
    parts.push(tags['addr:postcode']);
  }
  
  return parts.length > 0 ? parts.join(', ') : null;
}

// Background seeding task
async function performSeeding(
  targetCities: typeof TARGET_CITIES,
  maxLocationsTotal: number,
  dryRun: boolean,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log(`Background seeding started: ${targetCities.length} cities, max ${maxLocationsTotal} locations, dryRun: ${dryRun}`);

  const stats = {
    citiesProcessed: 0,
    locationsFound: 0,
    locationsInserted: 0,
    locationsSkipped: 0,
    errors: [] as string[],
  };

  const locationsPerCity = Math.ceil(maxLocationsTotal / targetCities.length);
  const locationsToInsert: Array<{
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    city: string;
    country: string;
    address: string | null;
    osm_id: string;
    is_system_seeded: boolean;
    needs_enrichment: boolean;
    created_at: string;
  }> = [];

  // Process each city sequentially with delays
  for (const city of targetCities) {
    if (locationsToInsert.length >= maxLocationsTotal) break;

    console.log(`Processing ${city.name}, ${city.country}...`);
    let cityLocations = 0;

    for (const category of CATEGORIES) {
      if (cityLocations >= locationsPerCity) break;

      // Wait 3 seconds between Overpass queries to avoid rate limits
      await sleep(3000);

      const elements = await queryOverpassWithRetry(city, category);
      console.log(`  ${category.name}: found ${elements.length} POIs`);

      for (const element of elements) {
        if (cityLocations >= locationsPerCity || locationsToInsert.length >= maxLocationsTotal) break;

        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        const name = element.tags?.['name:en'] || element.tags?.name;

        if (!lat || !lon || !name) continue;

        const osmId = `${element.type}/${element.id}`;
        
        locationsToInsert.push({
          name,
          category: category.name,
          latitude: lat,
          longitude: lon,
          city: city.name,
          country: city.country,
          address: buildAddress(element.tags),
          osm_id: osmId,
          is_system_seeded: true,
          needs_enrichment: true,
          created_at: new Date().toISOString(),
        });

        cityLocations++;
        stats.locationsFound++;
      }
    }

    stats.citiesProcessed++;
    console.log(`  City total: ${cityLocations} locations`);
    
    // Wait between cities to avoid overwhelming Overpass
    await sleep(2000);
  }

  console.log(`Total locations to insert: ${locationsToInsert.length}`);

  if (dryRun) {
    console.log(`Dry run complete. Would insert ${locationsToInsert.length} locations.`);
    return;
  }

  // Insert in batches, skipping duplicates
  const batchSize = 100;
  for (let i = 0; i < locationsToInsert.length; i += batchSize) {
    const batch = locationsToInsert.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('locations')
      .upsert(batch, {
        onConflict: 'osm_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      console.error(`Batch insert error:`, error);
      stats.errors.push(`Batch ${i / batchSize}: ${error.message}`);
    } else {
      stats.locationsInserted += data?.length || 0;
    }
  }

  stats.locationsSkipped = stats.locationsFound - stats.locationsInserted;

  console.log(`Seeding complete:`, JSON.stringify(stats));
}

// Handle shutdown to log progress
addEventListener('beforeunload', (ev: Event) => {
  const detail = (ev as CustomEvent).detail;
  console.log('Function shutdown due to:', detail?.reason || 'unknown');
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Parse optional parameters
    let targetCities = TARGET_CITIES;
    let maxLocationsTotal = 1500;
    let dryRun = false;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.cities && Array.isArray(body.cities)) {
          targetCities = TARGET_CITIES.filter(c => body.cities.includes(c.name));
        }
        if (body.maxLocations) {
          maxLocationsTotal = body.maxLocations;
        }
        if (body.dryRun) {
          dryRun = body.dryRun;
        }
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    console.log(`Starting seed-locations: ${targetCities.length} cities, max ${maxLocationsTotal} locations, dryRun: ${dryRun}`);

    // Use background task so we don't timeout
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      performSeeding(targetCities, maxLocationsTotal, dryRun, supabaseUrl, supabaseServiceKey)
    );

    // Return immediately with status
    return new Response(JSON.stringify({
      success: true,
      message: `Seeding started in background for ${targetCities.length} cities. Check logs for progress.`,
      estimatedTime: `${Math.ceil(targetCities.length * 8 * 3 / 60)} minutes`, // ~3s per category, 8 categories per city
      dryRun,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Seed locations error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
