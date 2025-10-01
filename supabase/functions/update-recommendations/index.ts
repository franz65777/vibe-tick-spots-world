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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting recommendation score calculation...');

    // Get all users
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id');

    if (usersError) throw usersError;

    // Get all locations
    const { data: locations, error: locationsError } = await supabaseClient
      .from('locations')
      .select('id, category, created_at');

    if (locationsError) throw locationsError;

    console.log(`Processing ${users?.length || 0} users and ${locations?.length || 0} locations`);

    const recommendations = [];

    for (const user of users || []) {
      // Get user's saved places and categories preferences
      const { data: savedPlaces } = await supabaseClient
        .from('user_saved_locations')
        .select('location_id, locations(category)')
        .eq('user_id', user.id);

      // Calculate category weights (personal preference)
      const categoryWeights: Record<string, number> = {};
      savedPlaces?.forEach((sp: any) => {
        const category = sp.locations?.category;
        if (category) {
          categoryWeights[category] = (categoryWeights[category] || 0) + 1;
        }
      });

      // Normalize category weights
      const totalSaves = Object.values(categoryWeights).reduce((a, b) => a + b, 0) || 1;
      Object.keys(categoryWeights).forEach(cat => {
        categoryWeights[cat] = categoryWeights[cat] / totalSaves;
      });

      // Get user's following
      const { data: following } = await supabaseClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = following?.map(f => f.following_id) || [];

      for (const location of locations || []) {
        // Skip if user already saved this location
        const alreadySaved = savedPlaces?.some((sp: any) => sp.location_id === location.id);
        if (alreadySaved) continue;

        let score = 0;

        // 1. Personal preference (40% weight)
        const categoryPreference = categoryWeights[location.category] || 0;
        score += categoryPreference * 0.4;

        // 2. Friends interest (30% weight)
        const { count: friendsSaved } = await supabaseClient
          .from('user_saved_locations')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', location.id)
          .in('user_id', followingIds.length > 0 ? followingIds : ['00000000-0000-0000-0000-000000000000']);

        const friendsInterest = Math.min((friendsSaved || 0) / Math.max(followingIds.length, 1), 1);
        score += friendsInterest * 0.3;

        // 3. Global trend (20% weight)
        const { count: totalSaves } = await supabaseClient
          .from('user_saved_locations')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', location.id);

        const globalTrend = Math.min((totalSaves || 0) / 100, 1); // Normalize to 0-1
        score += globalTrend * 0.2;

        // 4. Recency (10% weight)
        const daysSinceCreated = (Date.now() - new Date(location.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const recency = Math.max(0, 1 - daysSinceCreated / 30); // Recent places get higher score
        score += recency * 0.1;

        // Only store if score is meaningful
        if (score > 0.1) {
          recommendations.push({
            user_id: user.id,
            location_id: location.id,
            score: Math.round(score * 100) / 100,
            category: location.category,
            friends_saved: friendsSaved || 0,
            total_saves: totalSaves || 0
          });
        }
      }
    }

    console.log(`Generated ${recommendations.length} recommendations`);

    // Delete old recommendations
    await supabaseClient.from('user_recommendations').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');

    // Insert new recommendations in batches
    const batchSize = 1000;
    for (let i = 0; i < recommendations.length; i += batchSize) {
      const batch = recommendations.slice(i, i + batchSize);
      const { error: insertError } = await supabaseClient
        .from('user_recommendations')
        .insert(batch);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw insertError;
      }
    }

    console.log('Recommendations updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: recommendations.length,
        message: 'Recommendations updated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
