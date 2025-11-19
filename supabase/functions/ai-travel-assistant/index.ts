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
    const { messages, userLanguage } = await req.json();
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
    let profile: any = null;
    
    if (user) {
      console.log("Fetching comprehensive user data...");

      // Get user profile with actual username
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, current_city, cities_visited, places_visited")
        .eq("id", user.id)
        .single();
      
      profile = profileData;

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
- Username: ${profileData?.username || "Traveler"}
- Current City: ${Object.keys(placesByCity)[0] || "Not set"}
- Total saved places: ${allSaves.length}
- Cities with saved places: ${Object.keys(placesByCity).join(", ") || "None"}

PREFERENCES & TASTE:
- Favorite categories: ${topCategories.join(", ") || "No clear preference yet"}
- Common save tags: ${topTags.join(", ") || "No tags yet"}
- Rating patterns: ${ratings.high} high-rated, ${ratings.medium} medium-rated, ${ratings.low} low-rated places
- User posts count: ${userPosts?.length || 0}

SAVED PLACES BY CITY (with tags/categories):
${Object.entries(placesByCity).map(([city, places]) => 
  `${city} (${places.length} luoghi salvati):\n${places.slice(0, 5).map(p => {
    const tags = p.tags && p.tags.length > 0 ? ` [${p.tags.join(', ')}]` : '';
    return `  - ${p.name} (${p.category})${tags}`;
  }).join('\n')}`
).join('\n\n') || "Nessun luogo salvato ancora"}

FRIENDS' SAVED PLACES:
${Object.entries(friendsPlacesByCity).slice(0, 3).map(([city, places]) => 
  `${city} (${places.length} luoghi dagli amici):\n${places.slice(0, 5).map(p => `  - ${p.name} (${p.category}) - salvato da ${p.friendUsername}`).join('\n')}`
).join('\n\n') || "Nessun luogo dagli amici ancora"}

LIKED POST LOCATIONS:
${likedLocations.slice(0, 10).map(l => `- ${l.name} (${l.category}) in ${l.city}`).join('\n') || "Nessuno"}
      `.trim();
    }

    // Extract user query details for smart search
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const queryLower = lastUserMessage.toLowerCase();
    
    // Check if user is asking about specific food/cuisine
    const cuisineMatch = queryLower.match(/\b(italian|mexican|japanese|chinese|thai|indian|french|korean|vietnamese|greek|spanish|turkish|lebanese|brazilian|peruvian|messican[oa]|italiano|giapponese|cinese|taco|burrito|margarita|pizza|pasta|sushi|curry)\b/i);
    const cityMatch = queryLower.match(/\b(?:in|a|ad|at)\s+([a-z\s]+?)(?:\s|$|,|\?)/i);
    
    let smartSearchContext = "";
    if (cuisineMatch && cityMatch) {
      const cuisine = cuisineMatch[0];
      const city = cityMatch[1].trim();
      
      console.log(`Smart search: ${cuisine} in ${city}`);
      
      // Search for posts with relevant keywords in that city
      const searchKeywords = [cuisine, 'taco', 'burrito', 'margarita', 'authentic', 'delicious'];
      const orConditions = searchKeywords.map(kw => `caption.ilike.%${kw}%`).join(',');
      
      const { data: relevantPosts } = await supabase
        .from("posts")
        .select(`
          caption,
          user_id,
          media_url,
          locations (
            id,
            name,
            category,
            city,
            description,
            google_place_id
          ),
          profiles:user_id (
            id,
            username
          )
        `)
        .or(orConditions)
        .not('media_url', 'is', null)
        .limit(50);
      
      // Also search post_reviews for keyword mentions
      const { data: reviewsWithKeywords } = await supabase
        .from("post_reviews")
        .select(`
          comment,
          rating,
          location_id,
          user_id,
          locations (
            id,
            name,
            category,
            city,
            google_place_id
          ),
          profiles:user_id (
            id,
            username
          )
        `)
        .or(orConditions)
        .limit(50);
      
      const matchingLocations = relevantPosts
        ?.filter(p => p.locations?.city?.toLowerCase().includes(city.toLowerCase()))
        .map(p => ({
          ...p.locations,
          keywords: extractKeywords(p.caption || ''),
          userMention: p.profiles?.username ? `${p.profiles.username}|${p.profiles.id}` : null,
          userComment: p.caption
        }))
        .filter((loc, index, self) => 
          loc && self.findIndex(l => l?.id === loc.id) === index
        ) || [];
      
      const reviewLocations = reviewsWithKeywords
        ?.filter(r => r.locations?.city?.toLowerCase().includes(city.toLowerCase()))
        .map(r => ({
          ...r.locations,
          keywords: extractKeywords(r.comment || ''),
          rating: r.rating,
          userMention: r.profiles?.username ? `${r.profiles.username}|${r.profiles.id}` : null,
          userComment: r.comment
        }))
        .filter((loc, index, self) => 
          loc && self.findIndex(l => l?.id === loc.id) === index
        ) || [];
      
      // Merge and deduplicate
      const allMatches = [...matchingLocations, ...reviewLocations].reduce((acc, loc) => {
        const existing = acc.find(l => l.id === loc.id);
        if (existing) {
          existing.keywords = [...new Set([...(existing.keywords || []), ...(loc.keywords || [])])];
          if (loc.userMention && !existing.userMentions) {
            existing.userMentions = [loc.userMention];
          } else if (loc.userMention && !existing.userMentions.includes(loc.userMention)) {
            existing.userMentions.push(loc.userMention);
          }
          if (loc.userComment && !existing.userComments) {
            existing.userComments = [loc.userComment];
          } else if (loc.userComment && !existing.userComments?.includes(loc.userComment)) {
            existing.userComments.push(loc.userComment);
          }
        } else {
          acc.push({
            ...loc,
            userMentions: loc.userMention ? [loc.userMention] : [],
            userComments: loc.userComment ? [loc.userComment] : []
          });
        }
        return acc;
      }, [] as any[]);
      
      if (allMatches.length > 0) {
        smartSearchContext = `\n\nVERIFIED LOCATIONS IN DATABASE FOR "${cuisine}" IN ${city.toUpperCase()}:
${allMatches.slice(0, 8).map(loc => {
  const keywords = loc.keywords?.length > 0 ? ` (Keywords: ${loc.keywords.join(', ')})` : '';
  const users = loc.userMentions?.length > 0 ? ` - Mentioned by: ${loc.userMentions.map((u: string) => u.split('|')[0]).join(', ')}` : '';
  const userIds = loc.userMentions?.length > 0 ? ` - UserIDs: ${loc.userMentions.map((u: string) => u.split('|')[1]).join(', ')}` : '';
  const comments = loc.userComments?.length > 0 ? ` - Comments: "${loc.userComments.join('; ')}"` : '';
  return `- ${loc.name} - ID: ${loc.google_place_id || `internal:${loc.id}`}${keywords}${users}${userIds}${comments}`;
}).join('\n')}

IMPORTANT: Only recommend places from this list. When mentioning a place, also mention the user who recommended it using [USER:username|user_id] format. If a place is not in this list, tell the user they could be the first on Spott to try it and recommend it to friends!`;
      }
    }
    
    function extractKeywords(text: string): string[] {
      const keywords: string[] = [];
      const lowerText = text.toLowerCase();
      const terms = ['margarita', 'taco', 'burrito', 'authentic', 'delicious', 'amazing', 'best', 'great', 'perfect', 'ottimo', 'autentico', 'delizioso'];
      
      terms.forEach(term => {
        if (lowerText.includes(term)) keywords.push(term);
      });
      
      return [...new Set(keywords)];
    }

    const languageInstruction = userLanguage ? `IMPORTANT: Respond ONLY in ${userLanguage}. All text, greetings, and explanations must be in ${userLanguage}.` : '';
    
    const systemPrompt = `You are a knowledgeable, friendly travel assistant AI integrated into Spott, a social travel discovery app. Your goal is to help users discover amazing places based on their preferences, past saves, and social connections.

${languageInstruction}

CONTEXT:
${userContext}${smartSearchContext}

CRITICAL FORMATTING RULES:
1. ALWAYS start your response with a greeting using the Username from USER PROFILE in the user's language
2. When mentioning places from the database, wrap them EXACTLY like this: [PLACE:place_name|place_id]
   - Example: "Ti consiglio [PLACE:Masa Drury St|ChIJ123abc] per i tacos"
3. When mentioning users who reviewed/posted, use: [USER:username|user_id]
   - Example: "[USER:fratrinky|uuid-123] dice che fanno ottimi margaritas!"
4. NEVER use asterisks (**) around place or user names
5. Write naturally, then wrap ONLY names in [PLACE:name|id] or [USER:username|id]
6. If a place is NOT in verified list, say: "Potresti essere il primo su Spott a provare [place name]!"

RESPONSE GUIDELINES:
1. START WITH GREETING: Always greet with username in the user's language
2. KEEP IT CONCISE: Max 3-4 short sentences. Users hate long paragraphs!
3. Use "luoghi salvati" not "mi piace" when talking about user's saves
4. Mention save_tags context (night out, family, romantic, date, aperitivo, etc.) when relevant
5. ALWAYS cite users who posted/reviewed: "[USER:username|id] dice che..." or "Secondo [USER:username|id]..."
6. Extract keywords from reviews/posts (margaritas, tacos autentici, etc.)
7. PRIORITIZE locations with posts/content (media_url) to show better experiences
8. Prioritize verified database locations over generic suggestions
9. Recommend friends' saved places when relevant
10. Use emojis sparingly (max 1-2 per response)
11. Be warm, enthusiastic, but BRIEF and accurate

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
