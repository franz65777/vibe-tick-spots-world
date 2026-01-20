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

// Categories to seed - increased limits for more locations
const CATEGORIES = [
  { name: 'restaurant', amenity: 'restaurant', limit: 40 },
  { name: 'cafe', amenity: 'cafe', limit: 30 },
  { name: 'bar', amenity: 'bar', limit: 20 },
  { name: 'hotel', amenity: 'hotel', limit: 15 },
  { name: 'museum', amenity: 'museum', limit: 10 },
  { name: 'bakery', amenity: 'bakery', limit: 15 },
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
    amenity?: string;
  };
}

interface ValidationResult {
  valid: boolean;
  google_place_id?: string;
  business_status?: string;
  skip_reason?: 'not_found' | 'closed_permanently' | 'location_mismatch';
}

interface ValidationStats {
  validated: number;
  skipped_not_found: number;
  skipped_closed: number;
  skipped_mismatch: number;
  api_errors: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Calculate distance between two points in km (Haversine formula)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Validate a location using Google Find Place API (FREE under $200 credit)
async function validateWithGoogle(
  name: string,
  lat: number,
  lng: number,
  apiKey: string
): Promise<ValidationResult> {
  try {
    const encodedName = encodeURIComponent(name);
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedName}&inputtype=textquery&locationbias=point:${lat},${lng}&fields=place_id,business_status,geometry&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Google API error: ${response.status}`);
      return { valid: true }; // Default to valid on API errors to not block seeding
    }
    
    const data = await response.json();
    
    // Check for zero results
    if (data.status === 'ZERO_RESULTS' || !data.candidates?.length) {
      return { valid: false, skip_reason: 'not_found' };
    }
    
    const candidate = data.candidates[0];
    
    // Check if permanently closed
    if (candidate.business_status === 'CLOSED_PERMANENTLY') {
      return { 
        valid: false, 
        skip_reason: 'closed_permanently',
        google_place_id: candidate.place_id,
        business_status: candidate.business_status
      };
    }
    
    // Check distance (if geometry is available)
    if (candidate.geometry?.location) {
      const distance = calculateDistanceKm(
        lat, lng,
        candidate.geometry.location.lat,
        candidate.geometry.location.lng
      );
      
      // Skip if distance > 1km (increased tolerance - OSM and Google often have slightly different coordinates)
      if (distance > 1.0) {
        return { valid: false, skip_reason: 'location_mismatch' };
      }
    }
    
    // Location is valid!
    return {
      valid: true,
      google_place_id: candidate.place_id,
      business_status: candidate.business_status || 'OPERATIONAL'
    };
    
  } catch (error) {
    console.error(`Validation error for "${name}":`, error);
    return { valid: true }; // Default to valid on errors
  }
}

// Query Overpass with a single combined query for all categories in a city
async function queryOverpassCity(
  city: typeof TARGET_CITIES[0],
  maxRetries = 3
): Promise<{ category: string; elements: OverpassElement[] }[]> {
  const radiusMeters = 8000; // 8km radius for better coverage
  
  // Combined query for all amenities at once - much more efficient
  const amenityList = CATEGORIES.map(c => c.amenity).join('|');
  
  const query = `
    [out:json][timeout:90];
    (
      node["amenity"~"^(${amenityList})$"]["name"](around:${radiusMeters},${city.lat},${city.lng});
      way["amenity"~"^(${amenityList})$"]["name"](around:${radiusMeters},${city.lat},${city.lng});
    );
    out center 200;
  `;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.status === 429 || response.status === 504 || response.status === 503) {
        const waitTime = Math.min(8000 * attempt, 25000);
        console.log(`Rate limited for ${city.name}, waiting ${waitTime}ms (attempt ${attempt})`);
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) {
        console.error(`Overpass API error for ${city.name}: ${response.status}`);
        if (attempt < maxRetries) {
          await sleep(5000 * attempt);
          continue;
        }
        return [];
      }

      const data = await response.json();
      const elements = data.elements || [];
      
      // Group by category
      const grouped: { category: string; elements: OverpassElement[] }[] = [];
      for (const cat of CATEGORIES) {
        const catElements = elements.filter((e: OverpassElement) => 
          e.tags?.amenity === cat.amenity
        ).slice(0, cat.limit);
        grouped.push({ category: cat.name, elements: catElements });
      }
      
      return grouped;
    } catch (error) {
      if (attempt < maxRetries) {
        const waitTime = Math.min(5000 * attempt, 15000);
        console.log(`Error for ${city.name}, retrying in ${waitTime}ms: ${error}`);
        await sleep(waitTime);
      } else {
        console.error(`Failed after ${maxRetries} attempts for ${city.name}:`, error);
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse parameters
    let cityBatchStart = 0;
    let cityBatchSize = 3; // Process 3 cities at a time (safer for timeout)
    let dryRun = false;
    let specificCities: string[] | null = null;
    let enableValidation = true; // New: enable/disable Google validation
    let maxValidationsPerBatch = 150; // Reduced to avoid WORKER_LIMIT errors

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.batchStart !== undefined) cityBatchStart = body.batchStart;
        if (body.batchSize !== undefined) cityBatchSize = body.batchSize;
        if (body.dryRun) dryRun = body.dryRun;
        if (body.cities && Array.isArray(body.cities)) {
          specificCities = body.cities;
        }
        if (body.enableValidation !== undefined) enableValidation = body.enableValidation;
        if (body.maxValidationsPerBatch !== undefined) maxValidationsPerBatch = body.maxValidationsPerBatch;
      } catch {
        // Use defaults
      }
    }

    // Check if Google API key is available for validation
    const canValidate = enableValidation && !!googleApiKey;
    if (enableValidation && !googleApiKey) {
      console.warn('⚠️ GOOGLE_MAPS_API_KEY not set - proceeding without validation');
    }

    // Determine which cities to process
    let citiesToProcess: typeof TARGET_CITIES;
    if (specificCities) {
      citiesToProcess = TARGET_CITIES.filter(c => specificCities!.includes(c.name));
    } else {
      citiesToProcess = TARGET_CITIES.slice(cityBatchStart, cityBatchStart + cityBatchSize);
    }

    if (citiesToProcess.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'All cities processed!',
        completed: true,
        totalCities: TARGET_CITIES.length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${citiesToProcess.length} cities: ${citiesToProcess.map(c => c.name).join(', ')}`);
    console.log(`Batch: ${cityBatchStart} to ${cityBatchStart + cityBatchSize}, dryRun: ${dryRun}, validation: ${canValidate}`);

    const stats = {
      citiesProcessed: 0,
      locationsFound: 0,
      locationsInserted: 0,
      errors: [] as string[],
    };

    const validationStats: ValidationStats = {
      validated: 0,
      skipped_not_found: 0,
      skipped_closed: 0,
      skipped_mismatch: 0,
      api_errors: 0,
    };

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
      google_place_id: string | null;
      business_status: string | null;
      is_validated: boolean;
      validated_at: string | null;
    }> = [];

    let totalValidations = 0;
    const seenGoogleIds = new Set<string>(); // Track seen Google Place IDs to avoid duplicates

    // Process cities sequentially with delays
    for (const city of citiesToProcess) {
      console.log(`🏙️ Processing ${city.name}, ${city.country}...`);
      
      // Query all categories at once for this city
      const results = await queryOverpassCity(city);
      
      let cityTotal = 0;
      let cityValidated = 0;
      let citySkipped = 0;

      for (const { category, elements } of results) {
        for (const element of elements) {
          const lat = element.lat ?? element.center?.lat;
          const lon = element.lon ?? element.center?.lon;
          const name = element.tags?.['name:en'] || element.tags?.name;

          if (!lat || !lon || !name) continue;

          const osmId = `${element.type}/${element.id}`;
          
          // Validate with Google if enabled and under limit
          let validationResult: ValidationResult = { valid: true };
          
          if (canValidate && totalValidations < maxValidationsPerBatch) {
            validationResult = await validateWithGoogle(name, lat, lon, googleApiKey!);
            totalValidations++;
            
            // Small delay to avoid rate limiting (100ms = 10 calls/sec)
            await sleep(100);
            
            if (!validationResult.valid) {
              citySkipped++;
              switch (validationResult.skip_reason) {
                case 'not_found':
                  validationStats.skipped_not_found++;
                  console.log(`  ❌ Skipped "${name}" - not found on Google`);
                  break;
                case 'closed_permanently':
                  validationStats.skipped_closed++;
                  console.log(`  ❌ Skipped "${name}" - permanently closed`);
                  break;
                case 'location_mismatch':
                  validationStats.skipped_mismatch++;
                  console.log(`  ❌ Skipped "${name}" - location mismatch (>1km)`);
                  break;
              }
              continue; // Skip this location
            }
            
            // Check for duplicate Google Place ID within this batch
            if (validationResult.google_place_id && seenGoogleIds.has(validationResult.google_place_id)) {
              console.log(`  ⏭️ Skipped "${name}" - duplicate Google Place ID`);
              continue;
            }
            if (validationResult.google_place_id) {
              seenGoogleIds.add(validationResult.google_place_id);
            }
            
            cityValidated++;
            validationStats.validated++;
          }
          
          locationsToInsert.push({
            name,
            category,
            latitude: lat,
            longitude: lon,
            city: city.name,
            country: city.country,
            address: buildAddress(element.tags),
            osm_id: osmId,
            is_system_seeded: true,
            needs_enrichment: true,
            created_at: new Date().toISOString(),
            google_place_id: validationResult.google_place_id || null,
            business_status: validationResult.business_status || null,
            is_validated: canValidate && validationResult.valid,
            validated_at: canValidate ? new Date().toISOString() : null,
          });

          cityTotal++;
          stats.locationsFound++;
        }
      }
      
      stats.citiesProcessed++;
      const validationInfo = canValidate ? ` (✓ ${cityValidated} validated, ✗ ${citySkipped} skipped)` : '';
      console.log(`✅ ${city.name}: ${cityTotal} locations${validationInfo}`);
      
      // Wait between cities to be nice to Overpass
      if (citiesToProcess.indexOf(city) < citiesToProcess.length - 1) {
        await sleep(2000);
      }
    }

    console.log(`📊 Total locations to insert: ${locationsToInsert.length}`);
    if (canValidate) {
      console.log(`📊 Validation stats: ${validationStats.validated} validated, ${validationStats.skipped_not_found} not found, ${validationStats.skipped_closed} closed, ${validationStats.skipped_mismatch} mismatch`);
    }

    if (!dryRun && locationsToInsert.length > 0) {
      // Insert in batches
      const batchSize = 50;
      for (let i = 0; i < locationsToInsert.length; i += batchSize) {
        const batch = locationsToInsert.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('locations')
          .upsert(batch, {
            onConflict: 'osm_id', // Use single constraint - duplicates handled by seenGoogleIds
            ignoreDuplicates: false, // Update with new validation data
          })
          .select('id');

        if (error) {
          console.error(`Batch insert error:`, error);
          stats.errors.push(error.message);
        } else {
          stats.locationsInserted += data?.length || 0;
        }
      }
      
      console.log(`💾 Inserted ${stats.locationsInserted} locations`);
    }

    const elapsed = Date.now() - startTime;
    const nextBatchStart = cityBatchStart + cityBatchSize;
    const hasMore = nextBatchStart < TARGET_CITIES.length;

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      validationEnabled: canValidate,
      stats: {
        ...stats,
        elapsedMs: elapsed,
      },
      validationStats: canValidate ? validationStats : null,
      batch: {
        start: cityBatchStart,
        size: cityBatchSize,
        citiesProcessed: citiesToProcess.map(c => c.name),
      },
      next: hasMore ? {
        batchStart: nextBatchStart,
        remaining: TARGET_CITIES.length - nextBatchStart,
      } : null,
      completed: !hasMore,
      totalCities: TARGET_CITIES.length,
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
