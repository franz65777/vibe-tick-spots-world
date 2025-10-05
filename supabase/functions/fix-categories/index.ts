import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all locations with place_types data
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, category, place_types')
      .not('place_types', 'is', null)
      .limit(200);

    if (error) throw error;

    console.log(`Processing ${locations?.length || 0} locations for category fixes`);

    let updated = 0;
    const categoryMapping: Record<string, string> = {
      'cafe': ['cafe', 'coffee_shop'],
      'restaurant': ['restaurant', 'meal_delivery', 'meal_takeaway', 'food'],
      'bar': ['bar', 'night_club', 'liquor_store'],
      'hotel': ['lodging', 'hotel', 'motel'],
      'museum': ['museum', 'art_gallery', 'tourist_attraction'],
      'entertainment': ['movie_theater', 'bowling_alley', 'amusement_park', 'casino', 'stadium'],
    };

    for (const location of locations || []) {
      try {
        const placeTypes = location.place_types || [];
        let newCategory = location.category;

        // Priority order for category assignment
        // Check cafe first (most specific)
        if (placeTypes.some((type: string) => categoryMapping['cafe'].includes(type))) {
          newCategory = 'cafe';
        }
        // Then bar
        else if (placeTypes.some((type: string) => categoryMapping['bar'].includes(type))) {
          newCategory = 'bar';
        }
        // Then hotel
        else if (placeTypes.some((type: string) => categoryMapping['hotel'].includes(type))) {
          newCategory = 'hotel';
        }
        // Then entertainment
        else if (placeTypes.some((type: string) => categoryMapping['entertainment'].includes(type))) {
          newCategory = 'entertainment';
        }
        // Then museum
        else if (placeTypes.some((type: string) => categoryMapping['museum'].includes(type))) {
          newCategory = 'museum';
        }
        // Finally restaurant (most generic)
        else if (placeTypes.some((type: string) => categoryMapping['restaurant'].includes(type))) {
          newCategory = 'restaurant';
        }

        // Update if category changed
        if (newCategory !== location.category) {
          const { error: updateError } = await supabase
            .from('locations')
            .update({ category: newCategory })
            .eq('id', location.id);

          if (updateError) {
            console.error(`Error updating ${location.name}:`, updateError);
          } else {
            console.log(`✅ Updated ${location.name}: ${location.category} → ${newCategory}`);
            updated++;
          }
        }

      } catch (error) {
        console.error(`Error processing location ${location.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fixed ${updated} location categories`,
        processed: locations?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fix-categories function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fix categories',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
