import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cost constants - Find Place (ID only) is FREE under $200 credit
const COSTS = {
  FIND_PLACE_ID_ONLY: 0,  // Find Place (ID only) - FREE under $200 credit!
};

interface ValidateRequest {
  name: string;
  latitude: number;
  longitude: number;
}

interface ValidateResponse {
  valid: boolean;
  google_place_id?: string;
  business_status?: string;
  error?: string;
}

// Helper to get current billing month
function getCurrentBillingMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Budget check - returns { allowed, enabled, spent, limit } 
async function checkBudgetAndKillSwitch(supabase: any): Promise<{
  allowed: boolean;
  enabled: boolean;
  spent: number;
  limit: number;
  message?: string;
}> {
  // Get budget settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'google_api_budget')
    .single();

  const budgetSettings = settings?.value || { monthly_limit_usd: 10, enabled: false };
  const monthlyLimit = budgetSettings.monthly_limit_usd || 10;
  const enabled = budgetSettings.enabled === true;

  // If kill switch is off, allow (fail-open for validation to not block saves)
  if (!enabled) {
    return {
      allowed: true,  // Fail-open: allow saves even if API disabled
      enabled: false,
      spent: 0,
      limit: monthlyLimit,
      message: 'Google API is disabled - validation skipped'
    };
  }

  // Get current month spend
  const currentMonth = getCurrentBillingMonth();
  const { data: costData } = await supabase
    .from('google_api_costs')
    .select('cost_usd')
    .eq('billing_month', currentMonth);

  const totalSpent = costData?.reduce((sum: number, r: any) => sum + (r.cost_usd || 0), 0) || 0;

  if (totalSpent >= monthlyLimit) {
    return {
      allowed: true,  // Fail-open: allow saves even if budget exceeded
      enabled: true,
      spent: totalSpent,
      limit: monthlyLimit,
      message: `Budget exceeded - validation skipped`
    };
  }

  return {
    allowed: true,
    enabled: true,
    spent: totalSpent,
    limit: monthlyLimit
  };
}

// Track API cost in database
async function trackApiCost(
  supabase: any,
  apiType: string,
  cost: number,
  locationId?: string
): Promise<void> {
  try {
    const billingMonth = getCurrentBillingMonth();
    await supabase.from('google_api_costs').insert({
      api_type: apiType,
      cost_usd: cost,
      request_count: 1,
      billing_month: billingMonth,
      location_id: locationId || null
    });
  } catch (err) {
    console.error('Failed to track API cost:', err);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, latitude, longitude } = await req.json() as ValidateRequest;

    if (!name || latitude === undefined || longitude === undefined) {
      console.error('Missing required fields:', { name, latitude, longitude });
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      // If no API key, allow save but log warning
      return new Response(
        JSON.stringify({ valid: true, error: 'API key not configured - validation skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check budget before making Google API call
    const budgetStatus = await checkBudgetAndKillSwitch(supabase);
    
    if (!budgetStatus.enabled || budgetStatus.spent >= budgetStatus.limit) {
      console.log('Budget blocked or API disabled - validation skipped:', budgetStatus.message);
      // Fail-open: allow save without validation
      return new Response(
        JSON.stringify({ 
          valid: true, 
          error: budgetStatus.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Find Place API to search for the location
    const searchQuery = encodeURIComponent(name);
    const locationBias = `point:${latitude},${longitude}`;
    
    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${searchQuery}&inputtype=textquery&locationbias=${locationBias}&fields=place_id,business_status,name,geometry&key=${apiKey}`;

    console.log('Validating location:', { name, latitude, longitude });

    const response = await fetch(findPlaceUrl);
    const data = await response.json();

    // Track the API call cost (Find Place is FREE but we track for monitoring)
    await trackApiCost(supabase, 'find_place', COSTS.FIND_PLACE_ID_ONLY);

    console.log('Google Find Place response:', JSON.stringify(data));

    if (data.status === 'ZERO_RESULTS' || !data.candidates || data.candidates.length === 0) {
      console.log('Location not found on Google Maps:', name);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Location not found on Google Maps' 
        } as ValidateResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const candidate = data.candidates[0];
    
    // Check if business is permanently closed
    if (candidate.business_status === 'CLOSED_PERMANENTLY') {
      console.log('Location is permanently closed:', name);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          google_place_id: candidate.place_id,
          business_status: 'CLOSED_PERMANENTLY',
          error: 'This location is permanently closed' 
        } as ValidateResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the location is within reasonable distance (500m) from the provided coordinates
    if (candidate.geometry?.location) {
      const googleLat = candidate.geometry.location.lat;
      const googleLng = candidate.geometry.location.lng;
      const distance = calculateDistance(latitude, longitude, googleLat, googleLng);
      
      if (distance > 0.5) {
        console.log('Location coordinates mismatch, distance:', distance, 'km');
        // Still return valid but log the discrepancy
      }
    }

    console.log('Location validated successfully:', { 
      name, 
      google_place_id: candidate.place_id,
      business_status: candidate.business_status || 'OPERATIONAL'
    });

    return new Response(
      JSON.stringify({ 
        valid: true, 
        google_place_id: candidate.place_id,
        business_status: candidate.business_status || 'OPERATIONAL'
      } as ValidateResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating location:', error);
    // On error, allow save to prevent blocking user actions
    return new Response(
      JSON.stringify({ valid: true, error: 'Validation error - save allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
