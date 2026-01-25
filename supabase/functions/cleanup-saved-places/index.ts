import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cleanup Saved Places Duplicates
 * 
 * This function cleans up duplicate entries between saved_places and user_saved_locations.
 * It migrates orphaned saved_places to user_saved_locations and removes duplicates.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🧹 Starting saved_places cleanup...');

    // Step 1: Find all saved_places that have a corresponding location in locations table
    const { data: savedPlaces, error: fetchError } = await supabaseClient
      .from('saved_places')
      .select('id, place_id, place_name, user_id, city, coordinates, place_category, save_tag, created_at');

    if (fetchError) throw fetchError;

    console.log(`Found ${savedPlaces?.length || 0} total saved_places to check`);

    let migratedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const sp of savedPlaces || []) {
      if (!sp.place_id) {
        skippedCount++;
        continue;
      }

      // Check if a location exists with this google_place_id
      const { data: existingLocation } = await supabaseClient
        .from('locations')
        .select('id')
        .eq('google_place_id', sp.place_id)
        .maybeSingle();

      if (existingLocation) {
        // Location exists - check if user_saved_locations already has this entry
        const { data: existingUSL } = await supabaseClient
          .from('user_saved_locations')
          .select('id')
          .eq('user_id', sp.user_id)
          .eq('location_id', existingLocation.id)
          .maybeSingle();

        if (!existingUSL) {
          // Migrate to user_saved_locations
          const { error: insertError } = await supabaseClient
            .from('user_saved_locations')
            .insert({
              user_id: sp.user_id,
              location_id: existingLocation.id,
              save_tag: sp.save_tag || 'general',
              created_at: sp.created_at
            });

          if (insertError) {
            console.error(`Failed to migrate ${sp.place_name}:`, insertError.message);
            continue;
          }
          migratedCount++;
        }

        // Delete from saved_places (either way - it's now a duplicate or was migrated)
        const { error: deleteError } = await supabaseClient
          .from('saved_places')
          .delete()
          .eq('id', sp.id);

        if (deleteError) {
          console.error(`Failed to delete ${sp.place_name}:`, deleteError.message);
        } else {
          deletedCount++;
        }
      } else {
        // No location exists - create one from saved_place data
        const coords = sp.coordinates as any || {};
        const lat = coords.lat ? Number(coords.lat) : null;
        const lng = coords.lng ? Number(coords.lng) : null;

        if (lat && lng) {
          // Create location
          const { data: newLocation, error: createError } = await supabaseClient
            .from('locations')
            .insert({
              google_place_id: sp.place_id,
              name: sp.place_name || 'Unknown',
              category: sp.place_category || 'place',
              city: sp.city,
              latitude: lat,
              longitude: lng,
              created_by: sp.user_id
            })
            .select('id')
            .single();

          if (createError) {
            console.error(`Failed to create location for ${sp.place_name}:`, createError.message);
            skippedCount++;
            continue;
          }

          // Create user_saved_locations entry
          await supabaseClient
            .from('user_saved_locations')
            .insert({
              user_id: sp.user_id,
              location_id: newLocation.id,
              save_tag: sp.save_tag || 'general',
              created_at: sp.created_at
            });

          // Delete from saved_places
          await supabaseClient
            .from('saved_places')
            .delete()
            .eq('id', sp.id);

          migratedCount++;
          deletedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`✅ Cleanup complete: ${migratedCount} migrated, ${deletedCount} deleted, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete`,
        migrated: migratedCount,
        deleted: deletedCount,
        skipped: skippedCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
