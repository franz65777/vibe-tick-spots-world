import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Starting intelligent duplicate location cleanup...');

    // Get all locations
    const { data: allLocations, error: fetchError } = await supabaseClient
      .from('locations')
      .select('id, name, address, latitude, longitude, created_at, google_place_id')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`Found ${allLocations.length} total locations`);

    const duplicates: Array<{ keep: string; remove: string[] }> = [];
    const processed = new Set<string>();
    const threshold = 0.0001; // ~11 meters

    // Find duplicates by coordinates
    for (let i = 0; i < allLocations.length; i++) {
      const loc1 = allLocations[i];
      if (processed.has(loc1.id)) continue;

      const duplicateIds: string[] = [];

      for (let j = i + 1; j < allLocations.length; j++) {
        const loc2 = allLocations[j];
        if (processed.has(loc2.id)) continue;

        const latDiff = Math.abs(loc1.latitude - loc2.latitude);
        const lngDiff = Math.abs(loc1.longitude - loc2.longitude);

        if (latDiff < threshold && lngDiff < threshold) {
          console.log(`📍 Duplicate: "${loc1.name}" and "${loc2.name}"`);
          duplicateIds.push(loc2.id);
          processed.add(loc2.id);
        }
      }

      if (duplicateIds.length > 0) {
        duplicates.push({ keep: loc1.id, remove: duplicateIds });
        processed.add(loc1.id);
      }
    }

    console.log(`Found ${duplicates.length} duplicate groups`);

    let mergedCount = 0;
    let totalPostsMigrated = 0;
    let totalReviewsMigrated = 0;

    // Merge each group
    for (const group of duplicates) {
      console.log(`🔄 Merging ${group.remove.length} into ${group.keep}`);

      // Update posts
      const { count: postsCount } = await supabaseClient
        .from('posts')
        .update({ location_id: group.keep }, { count: 'exact' })
        .in('location_id', group.remove);
      
      if (postsCount) {
        totalPostsMigrated += postsCount;
        console.log(`  ✓ Migrated ${postsCount} posts`);
      }

      // Update post reviews (recensioni!)
      const { count: reviewsCount } = await supabaseClient
        .from('post_reviews')
        .update({ location_id: group.keep }, { count: 'exact' })
        .in('location_id', group.remove);
      
      if (reviewsCount) {
        totalReviewsMigrated += reviewsCount;
        console.log(`  ✓ Migrated ${reviewsCount} reviews`);
      }

      // Update saved locations
      await supabaseClient
        .from('user_saved_locations')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update interactions
      await supabaseClient
        .from('interactions')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update location likes
      await supabaseClient
        .from('location_likes')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update location swipes
      await supabaseClient
        .from('location_swipes')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update location view duration
      await supabaseClient
        .from('location_view_duration')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update media
      await supabaseClient
        .from('media')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update stories
      await supabaseClient
        .from('stories')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update folder locations
      await supabaseClient
        .from('folder_locations')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update reservations
      await supabaseClient
        .from('reservations')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update trip locations
      await supabaseClient
        .from('trip_locations')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update location shares
      await supabaseClient
        .from('user_location_shares')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update location rankings
      await supabaseClient
        .from('location_rankings')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update chat messages
      await supabaseClient
        .from('chat_messages')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update direct messages
      await supabaseClient
        .from('direct_messages')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update marketing campaigns
      await supabaseClient
        .from('marketing_campaigns')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Update event registrations
      await supabaseClient
        .from('event_registrations')
        .update({ location_id: group.keep })
        .in('location_id', group.remove);

      // Delete duplicates from dependent tables first
      await supabaseClient
        .from('user_muted_locations')
        .delete()
        .in('location_id', group.remove);

      await supabaseClient
        .from('user_notification_settings')
        .delete()
        .in('location_id', group.remove);

      await supabaseClient
        .from('user_recommendations')
        .delete()
        .in('location_id', group.remove);

      // Delete duplicate locations
      await supabaseClient
        .from('locations')
        .delete()
        .in('id', group.remove);

      mergedCount += group.remove.length;
    }

    console.log(`✅ Merged ${mergedCount} duplicate locations`);
    console.log(`📝 Total posts migrated: ${totalPostsMigrated}`);
    console.log(`⭐ Total reviews migrated: ${totalReviewsMigrated}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Merged ${mergedCount} duplicate locations, migrated ${totalPostsMigrated} posts and ${totalReviewsMigrated} reviews`,
        groups: duplicates.length,
        merged: mergedCount,
        postsMigrated: totalPostsMigrated,
        reviewsMigrated: totalReviewsMigrated,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
