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
      console.log("Fetching comprehensive user data...");

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, current_city, cities_visited, places_visited")
        .eq("id", user.id)
        .single();

      // Get user's saved places (Google Places)
      const { data: savedPlaces } = await supabase
        .from("saved_places")
        .select("place_name, place_category, city")
        .eq("user_id", user.id)
        .limit(100);

      // Get user's saved internal locations
      const { data: savedLocations } = await supabase
        .from("user_saved_locations")
        .select(`
          locations (
            name,
            category,
            city
          )
        `)
        .eq("user_id", user.id)
        .limit(100);

      // Get liked posts with locations
      const { data: likedPosts } = await supabase
        .from("post_likes")
        .select(`
          posts (
            locations (
              name,
              category,
              city
            )
          )
        `)
        .eq("user_id", user.id)
        .limit(50);

      // Get following users' saves
      const { data: followingSaves } = await supabase
        .from("follows")
        .select(`
          profiles!follows_following_id_fkey (
            username
          ),
          saved_places!saved_places_user_id_fkey (
            place_name,
            place_category,
            city
          )
        `)
        .eq("follower_id", user.id)
        .limit(50);

      // Combine and organize data
      const allSaves = [
        ...(savedPlaces || []).map(p => ({ name: p.place_name, category: p.place_category, city: p.city })),
        ...(savedLocations || []).map(l => ({ name: l.locations?.name, category: l.locations?.category, city: l.locations?.city }))
      ];

      const likedLocations = likedPosts?.filter(lp => lp.posts?.locations).map(lp => ({
        name: lp.posts.locations.name,
        category: lp.posts.locations.category,
        city: lp.posts.locations.city
      })) || [];

      // Group by city
      const placesByCity: Record<string, any[]> = {};
      allSaves.forEach(place => {
        const city = place.city || 'Unknown';
        if (!placesByCity[city]) placesByCity[city] = [];
        placesByCity[city].push(place);
      });

      userContext = `
USER PROFILE:
- Username: ${profile?.username || "Traveler"}
- Current City: ${profile?.current_city || "Not set"}
- Total saved places: ${allSaves.length}
- Cities with saved places: ${Object.keys(placesByCity).join(", ") || "None"}

SAVED PLACES BY CITY:
${Object.entries(placesByCity).map(([city, places]) => 
  `${city} (${places.length} places):\n${places.slice(0, 5).map(p => `  - ${p.name} (${p.category})`).join('\n')}`
).join('\n\n') || "No saved places yet"}

LIKED POST LOCATIONS:
${likedLocations.slice(0, 10).map(l => `- ${l.name} (${l.category}) in ${l.city}`).join('\n') || "None"}

RECOMMENDATIONS FROM FOLLOWING:
${followingSaves?.flatMap(fs => 
  fs.saved_places?.slice(0, 3).map(sp => 
    `- ${sp.place_name} (${sp.place_category}) in ${sp.city} (by @${fs.profiles?.username})`
  )
).filter(Boolean).slice(0, 15).join('\n') || "None"}
`;
    }

    const systemPrompt = `You are a concise, expert AI Travel Assistant for Spott, a location discovery and social travel app.

${userContext}

RESPONSE GUIDELINES:
- Keep responses SHORT and ACTIONABLE (3-5 sentences max for simple queries)
- Always prioritize places from people they follow (shown above) - these are trusted recommendations
- Reference actual saved places and liked locations by name
- For "where should I..." questions, give 2-3 specific suggestions with brief reasons
- Don't explain how the app works unless asked
- Be conversational but get straight to the point

EXAMPLE RESPONSES:
Q: "I'm visiting Rome, where should I eat sushi?"
A: "Based on your taste, try Hasekura - it's in Prati and similar to the spots you've liked. @marco also saved Sushisen in Termini area. Both get great reviews from travelers like you!"

Q: "Suggest a 4-day trip to Rome"
A: "Here's a 4-day Rome itinerary based on your saved places: Day 1: Trevi + Pantheon + Campo de' Fiori for dinner. Day 2: Vatican + Castel Sant'Angelo + Trastevere evening. Day 3: Colosseum + Roman Forum + Testaccio for authentic food. Day 4: Villa Borghese + Spanish Steps + Monti neighborhood. Want details on any day?"

Always reference actual data from their profile when making recommendations.`;

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
