import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache configuration
const CACHE_TTL_SECONDS = 300; // 5 minutes
let cachedResponse: { data: any; timestamp: number } | null = null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    
    // Return cached response if still valid
    if (cachedResponse && (now - cachedResponse.timestamp) < CACHE_TTL_SECONDS * 1000) {
      console.log('Returning cached trending cities response');
      return new Response(
        JSON.stringify(cachedResponse.data),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=60`,
            'X-Cache': 'HIT',
          } 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Use the global RPC for distinct place counts per city (now returns pin_count)
    const { data: cities, error } = await supabaseClient.rpc('get_global_city_counts');

    if (error) throw error;

    // Map pin_count to total for consistent API response
    const responseData = { 
      cities: (cities as any[]).slice(0, 12).map((c: any) => ({ city: c.city, total: Number(c.pin_count) })) 
    };

    // Update cache
    cachedResponse = { data: responseData, timestamp: now };
    console.log('Cached trending cities response');

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}, stale-while-revalidate=60`,
          'X-Cache': 'MISS',
        } 
      }
    );
  } catch (err) {
    console.error('trending-cities error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});