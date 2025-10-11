import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use ANON key to respect RLS policies - only publicly visible data
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch saved places cities - respects RLS policies
    const { data: saves, error } = await supabaseClient
      .from('saved_places')
      .select('city')
      .not('city', 'is', null);

    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of saves || []) {
      const city = (row as any).city as string | null;
      if (!city) continue;
      counts.set(city, (counts.get(city) || 0) + 1);
    }

    const cities = Array.from(counts.entries())
      .map(([city, total]) => ({ city, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    return new Response(
      JSON.stringify({ cities }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('trending-cities error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});