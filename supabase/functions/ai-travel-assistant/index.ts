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

      // Get user's saved places (Google Places) with ratings
      const { data: savedPlaces } = await supabase
        .from("saved_places")
        .select("place_name, place_category, city, rating, save_tags")
        .eq("user_id", user.id)
        .limit(100);

      // Get user's saved internal locations with ratings
      const { data: savedLocations } = await supabase
        .from("user_saved_locations")
        .select(`
          rating,
          save_tags,
          locations (
            name,
            category,
            city,
            description,
            metadata
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
              city,
              description
            )
          )
        `)
        .eq("user_id", user.id)
        .limit(50);

      // Get user's posts with locations and media
      const { data: userPosts } = await supabase
        .from("posts")
        .select(`
          caption,
          locations (
            name,
            category,
            city
          )
        `)
        .eq("user_id", user.id)
        .limit(50);

      // Get user's interaction preferences (most liked categories)
      const { data: interactions } = await supabase
        .from("interactions")
        .select(`
          action_type,
          weight,
          locations (
            category
          )
        `)
        .eq("user_id", user.id)
        .limit(200);

      // Get friends' saved places with more details
      const { data: friendsSaves } = await supabase
        .from("saved_places")
        .select(`
          place_name,
          place_category,
          city,
          rating,
          google_place_id,
          user_id,
          profiles!saved_places_user_id_fkey (
            username
          )
        `)
        .in('user_id', 
          (await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id)
          ).data?.map(f => f.following_id) || []
        )
        .limit(100);

      // Get friends' internal saved locations
      const { data: friendsLocations } = await supabase
        .from("user_saved_locations")
        .select(`
          rating,
          user_id,
          locations (
            id,
            name,
            category,
            city,
            description,
            google_place_id
          ),
          profiles!user_saved_locations_user_id_fkey (
            username
          )
        `)
        .in('user_id',
          (await supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id)
          ).data?.map(f => f.following_id) || []
        )
        .limit(100);

      // Analyze user preferences
      const categoryPreferences: Record<string, number> = {};
      const saveTags: Record<string, number> = {};
      const ratings: { high: number; medium: number; low: number } = { high: 0, medium: 0, low: 0 };

      // Process saved places with ratings
      savedPlaces?.forEach(place => {
        categoryPreferences[place.place_category] = (categoryPreferences[place.place_category] || 0) + 1;
        if (place.rating) {
          if (place.rating >= 4) ratings.high++;
          else if (place.rating >= 3) ratings.medium++;
          else ratings.low++;
        }
        if (place.save_tags && Array.isArray(place.save_tags)) {
          place.save_tags.forEach((tag: string) => {
            saveTags[tag] = (saveTags[tag] || 0) + 1;
          });
        }
      });

      // Process saved locations with ratings
      savedLocations?.forEach(loc => {
        if (loc.locations?.category) {
          categoryPreferences[loc.locations.category] = (categoryPreferences[loc.locations.category] || 0) + 1;
        }
        if (loc.rating) {
          if (loc.rating >= 4) ratings.high++;
          else if (loc.rating >= 3) ratings.medium++;
          else ratings.low++;
        }
        if (loc.save_tags && Array.isArray(loc.save_tags)) {
          loc.save_tags.forEach((tag: string) => {
            saveTags[tag] = (saveTags[tag] || 0) + 1;
          });
        }
      });

      // Process interactions for deeper insights
      interactions?.forEach(int => {
        if (int.locations?.category) {
          const weight = int.weight || 1;
          categoryPreferences[int.locations.category] = (categoryPreferences[int.locations.category] || 0) + weight;
        }
      });

      // Combine and organize data
      const allSaves = [
        ...(savedPlaces || []).map(p => ({ 
          name: p.place_name, 
          category: p.place_category, 
          city: p.city,
          rating: p.rating,
          tags: p.save_tags 
        })),
        ...(savedLocations || []).map(l => ({ 
          name: l.locations?.name, 
          category: l.locations?.category, 
          city: l.locations?.city,
          rating: l.rating,
          tags: l.save_tags,
          description: l.locations?.description
        }))
      ];

      const likedLocations = likedPosts?.filter(lp => lp.posts?.locations).map(lp => ({
        name: lp.posts.locations.name,
        category: lp.posts.locations.category,
        city: lp.posts.locations.city,
        description: lp.posts.locations.description
      })) || [];

      // Group by city
      const placesByCity: Record<string, any[]> = {};
      allSaves.forEach(place => {
        const city = place.city || 'Unknown';
        if (!placesByCity[city]) placesByCity[city] = [];
        placesByCity[city].push(place);
      });

      // Top preferences
      const topCategories = Object.entries(categoryPreferences)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, count]) => `${cat} (${count} saves)`);

      const topTags = Object.entries(saveTags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => `${tag} (${count} times)`);

      // Process friends' saves
      const friendsPlaces = [
        ...(friendsSaves || []).map(p => ({
          name: p.place_name,
          category: p.place_category,
          city: p.city,
          rating: p.rating,
          google_place_id: p.google_place_id,
          friendUsername: p.profiles?.username
        })),
        ...(friendsLocations || []).map(l => ({
          name: l.locations?.name,
          category: l.locations?.category,
          city: l.locations?.city,
          rating: l.rating,
          google_place_id: l.locations?.google_place_id,
          internal_id: l.locations?.id,
          friendUsername: l.profiles?.username
        }))
      ];

      const friendsPlacesByCity: Record<string, any[]> = {};
      friendsPlaces.forEach(place => {
        const city = place.city || 'Unknown';
        if (!friendsPlacesByCity[city]) friendsPlacesByCity[city] = [];
        friendsPlacesByCity[city].push(place);
      });

      userContext = `
USER PROFILE:
- Username: ${profile?.username || "Traveler"}
- Current City: ${profile?.current_city || "Not set"}
- Total saved places: ${allSaves.length}
- Cities with saved places: ${Object.keys(placesByCity).join(", ") || "None"}

PREFERENCES & TASTE:
- Favorite categories: ${topCategories.join(", ") || "No clear preference yet"}
- Common tags: ${topTags.join(", ") || "No tags yet"}
- Rating patterns: ${ratings.high} high-rated, ${ratings.medium} medium-rated, ${ratings.low} low-rated places
- User posts count: ${userPosts?.length || 0}

SAVED PLACES BY CITY:
${Object.entries(placesByCity).map(([city, places]) => 
  `${city} (${places.length} places):\n${places.slice(0, 5).map(p => `  - ${p.name} (${p.category})`).join('\n')}`
).join('\n\n') || "No saved places yet"}

FRIENDS' SAVED PLACES:
${Object.entries(friendsPlacesByCity).slice(0, 3).map(([city, places]) => 
  `${city} (${places.length} places from friends):\n${places.slice(0, 5).map(p => `  - ${p.name} (${p.category}) - saved by ${p.friendUsername}`).join('\n')}`
).join('\n\n') || "No friends' places available yet"}

LIKED POST LOCATIONS:
${likedLocations.slice(0, 10).map(l => `- ${l.name} (${l.category}) in ${l.city}`).join('\n') || "None"}
      `.trim();
    }

    // Extract user query details for smart search
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const queryLower = lastUserMessage.toLowerCase();
    
    // Check if user is asking about specific food/cuisine
    const cuisineMatch = queryLower.match(/\b(italian|mexican|japanese|chinese|thai|indian|french|korean|vietnamese|greek|spanish|turkish|lebanese|brazilian|peruvian|messican[oa]|italiano|giapponese|cinese)\b/);
    const cityMatch = queryLower.match(/\b(?:in|a|ad)\s+([a-z\s]+?)(?:\s|$|,|\?)/i);
    
    let smartSearchContext = "";
    if (cuisineMatch && cityMatch) {
      const cuisine = cuisineMatch[0];
      const city = cityMatch[1].trim();
      
      console.log(`Smart search: ${cuisine} in ${city}`);
      
      // Search for posts with relevant keywords in that city
      const { data: relevantPosts } = await supabase
        .from("posts")
        .select(`
          caption,
          locations (
            id,
            name,
            category,
            city,
            description,
            google_place_id
          )
        `)
        .or(`caption.ilike.%${cuisine}%,caption.ilike.%taco%,caption.ilike.%burrito%,caption.ilike.%margarita%`)
        .limit(30);
      
      const matchingLocations = relevantPosts
        ?.filter(p => p.locations?.city?.toLowerCase().includes(city.toLowerCase()))
        .map(p => p.locations)
        .filter((loc, index, self) => 
          loc && self.findIndex(l => l?.id === loc.id) === index
        ) || [];
      
      if (matchingLocations.length > 0) {
        smartSearchContext = `\n\nRELEVANT LOCATIONS FOR "${cuisine}" IN ${city.toUpperCase()} (from user posts):
${matchingLocations.slice(0, 10).map(loc => 
  `- ${loc.name} (${loc.category}) - ID: ${loc.google_place_id || `internal:${loc.id}`}`
).join('\n')}`;
      }
    }

    const systemPrompt = `You are a knowledgeable, friendly travel assistant AI integrated into Spott, a social travel discovery app. Your goal is to help users discover amazing places based on their preferences, past saves, and social connections.

CONTEXT:
${userContext}${smartSearchContext}

CRITICAL FORMATTING RULES:
1. When mentioning specific places, use this EXACT format: [PLACE:place_name|place_id]
   - For Google Places, use: [PLACE:Restaurant Name|ChIJxxxxx]
   - For internal locations, use: [PLACE:Restaurant Name|internal:uuid]
   - Example: "I recommend [PLACE:Masa Drury St|ChIJ123abc] for tacos"
2. DO NOT use asterisks (**) around place names
3. Each place name should be wrapped in [PLACE:name|id] tags so users can click on them
4. If you don't have the place_id, just use the name: [PLACE:Restaurant Name|unknown]

RESPONSE GUIDELINES:
1. Be conversational, warm, and enthusiastic about travel
2. Prioritize places the user has already saved when relevant
3. ALSO suggest places saved by the user's friends - these are great recommendations!
4. Consider the user's rating patterns and category preferences
5. Reference specific places using the [PLACE:name|id] format
6. When the user asks about specific cuisine or food type, use the smart search results to provide highly relevant suggestions
7. Keep responses concise but informative (2-3 paragraphs max unless asked for more detail)
8. Use emojis sparingly and naturally
9. Extract keywords from reviews and captions to enrich recommendations (e.g., "great margaritas", "authentic tacos")

Remember: You have access to the user's saves, friends' saves, and can search for specific cuisines/food types. Use [PLACE:name|id] format for ALL location mentions.`;

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
