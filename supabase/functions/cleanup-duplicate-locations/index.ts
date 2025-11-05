import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting cleanup of duplicate locations...');

    // These are the bad duplicate entries with invalid data (no coordinates, wrong google_place_id)
    const badLocationIds = [
      'cc443454-664b-4706-a50e-bf5e8bde2523', // Bad B Bar duplicate
      'd035a816-2e21-4ea8-82a5-827f5a655a12'  // Bad Brownes of Sandymount duplicate
    ];

    // First, delete user_saved_locations references
    const { data: savedDeleted, error: savedError } = await supabaseClient
      .from('user_saved_locations')
      .delete()
      .in('location_id', badLocationIds)
      .select();

    if (savedError) {
      console.error('Error deleting user_saved_locations:', savedError);
      throw savedError;
    }

    console.log(`Deleted ${savedDeleted?.length || 0} user_saved_locations references`);

    // Delete the bad locations
    const { data: locationsDeleted, error: locError } = await supabaseClient
      .from('locations')
      .delete()
      .in('id', badLocationIds)
      .select();

    if (locError) {
      console.error('Error deleting locations:', locError);
      throw locError;
    }

    console.log(`Deleted ${locationsDeleted?.length || 0} bad location entries`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Duplicate locations cleaned successfully',
        deleted: {
          savedLocations: savedDeleted?.length || 0,
          locations: locationsDeleted?.length || 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in cleanup-duplicate-locations:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
