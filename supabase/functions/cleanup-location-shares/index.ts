import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    // 1. Find all expired shares
    const { data: expiredShares, error: fetchError } = await supabaseClient
      .from("user_location_shares")
      .select("id, location_id, location_name, user_id")
      .lt("expires_at", now);

    if (fetchError) throw fetchError;

    console.log(`Found ${expiredShares?.length || 0} expired shares to clean up`);

    if (!expiredShares || expiredShares.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired shares to clean up", cleaned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Update related notifications to use past tense ("si trovava")
    for (const share of expiredShares) {
      const message = share.location_name
        ? `si trovava presso ${share.location_name}`
        : "si trovava in una posizione";

      await supabaseClient
        .from("notifications")
        .update({ message })
        .eq("type", "location_share")
        .contains("data", { location_id: share.location_id, shared_by_user_id: share.user_id });
    }

    // 3. Delete expired shares
    const { error: deleteError } = await supabaseClient
      .from("user_location_shares")
      .delete()
      .lt("expires_at", now);

    if (deleteError) throw deleteError;

    console.log(`Successfully cleaned up ${expiredShares.length} expired shares and updated notifications`);

    return new Response(
      JSON.stringify({
        message: "Cleanup completed successfully",
        cleaned: expiredShares.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error during cleanup:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
