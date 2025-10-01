import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user context from auth header
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } },
    });

    // Fetch user context
    const { data: { user } } = await supabase.auth.getUser();
    
    let userContext = "";
    if (user) {
      // Get user's saved places
      const { data: savedPlaces } = await supabase
        .from("saved_places")
        .select("place_name, place_category, city")
        .eq("user_id", user.id)
        .limit(20);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, bio, current_city, cities_visited, places_visited")
        .eq("id", user.id)
        .single();

      userContext = `
User Context:
- Username: ${profile?.username || "Traveler"}
- Current City: ${profile?.current_city || "Unknown"}
- Cities Visited: ${profile?.cities_visited || 0}
- Places Visited: ${profile?.places_visited || 0}
- Saved Places: ${savedPlaces?.map(p => `${p.place_name} (${p.place_category}) in ${p.city}`).join(", ") || "None yet"}
`;
    }

    const systemPrompt = `You are a friendly AI Travel Assistant for Spott, a location discovery and travel planning app. 

${userContext}

Your role is to help users:
- Discover amazing places to visit based on their interests
- Plan trips and create itineraries
- Get personalized recommendations based on their saved places and travel history
- Find hidden gems in cities they're interested in
- Connect travel experiences with friends

Be conversational, enthusiastic about travel, and provide specific, actionable suggestions. When recommending places, mention the type of place (restaurant, cafe, attraction, etc.) and what makes it special. Keep responses concise but helpful.

If the user hasn't saved many places yet, encourage them to explore and save places they're interested in.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-travel-assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
