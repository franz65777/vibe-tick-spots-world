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
    const { messages, userLanguage, currentLocation, currentTime, timezone } = await req.json();
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
    
    // Declare all variables that will be used across multiple if blocks
    let savedPlaces: any[] = [];
    let savedLocations: any[] = [];
    let likedPosts: any[] = [];
    let userPosts: any[] = [];
    let interactions: any[] = [];
    let friendsSaves: any[] = [];
    let friendsLocations: any[] = [];
    let friendsPlaces: any[] = [];
    
    const categoryPreferences: Record<string, number> = {};
    const saveTags: Record<string, number> = {};
    const ratings = { high: 0, medium: 0, low: 0 };
    
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
      const savedPlacesResult = await supabase
        .from("saved_places")
        .select("place_id, place_name, place_category, city, rating, save_tag")
        .eq("user_id", user.id)
        .limit(100);
      savedPlaces = savedPlacesResult.data || [];

      // Get user's saved internal locations with ratings
      const savedLocationsResult = await supabase
        .from("user_saved_locations")
        .select(`
          rating,
          save_tag,
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
      savedLocations = savedLocationsResult.data || [];

      // Get liked posts with locations
      const likedPostsResult = await supabase
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
      likedPosts = likedPostsResult.data || [];

      // Get user's posts with locations and media
      const userPostsResult = await supabase
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
      userPosts = userPostsResult.data || [];

      // Get user's interaction preferences (most liked categories)
      const interactionsResult = await supabase
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
      interactions = interactionsResult.data || [];

      // Get friends' saved places with more details
      const friendsSavesResult = await supabase
        .from("saved_places")
        .select(`
          place_id,
          place_name,
          place_category,
          city,
          rating,
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
      friendsSaves = friendsSavesResult.data || [];

      // Get friends' internal saved locations
      const friendsLocationsResult = await supabase
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
      friendsLocations = friendsLocationsResult.data || [];
    }

    // Build comprehensive context
    const isFirstMessage = messages.length <= 1;
    
    if (user) {

      // Process saved places with ratings
      savedPlaces?.forEach(place => {
        categoryPreferences[place.place_category] = (categoryPreferences[place.place_category] || 0) + 1;
        if (place.rating) {
          if (place.rating >= 4) ratings.high++;
          else if (place.rating >= 3) ratings.medium++;
          else ratings.low++;
        }
        const tag = (place as any).save_tag as string | undefined;
        if (tag) {
          saveTags[tag] = (saveTags[tag] || 0) + 1;
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
        const tag = (loc as any).save_tag as string | undefined;
        if (tag) {
          saveTags[tag] = (saveTags[tag] || 0) + 1;
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
          tags: (p as any).save_tag ? [((p as any).save_tag as string)] : []
        })),
        ...(savedLocations || []).map(l => ({ 
          name: l.locations?.name, 
          category: l.locations?.category, 
          city: l.locations?.city,
          rating: l.rating,
          tags: (l as any).save_tag ? [((l as any).save_tag as string)] : [],
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
      friendsPlaces = [
        ...(friendsSaves || []).map(p => ({
          name: p.place_name,
          category: p.place_category,
          city: p.city,
          rating: p.rating,
          google_place_id: (p as any).google_place_id || (p as any).place_id,
          friendUsername: p.profiles?.username,
          user_id: p.user_id,
          tags: (p as any).save_tag ? [((p as any).save_tag as string)] : []
        })),
        ...(friendsLocations || []).map(l => ({
          name: l.locations?.name,
          category: l.locations?.category,
          city: l.locations?.city,
          rating: l.rating,
          google_place_id: l.locations?.google_place_id,
          internal_id: l.locations?.id,
          friendUsername: l.profiles?.username,
          user_id: l.user_id,
          tags: (l as any).save_tag ? [((l as any).save_tag as string)] : []
        }))
      ];

      const friendsPlacesByCity: Record<string, any[]> = {};
      friendsPlaces.forEach(place => {
        const city = place.city || 'Unknown';
        if (!friendsPlacesByCity[city]) friendsPlacesByCity[city] = [];
        friendsPlacesByCity[city].push(place);
      });

      const greeting = isFirstMessage && profile?.username 
        ? `Hello @${profile.username}! 👋 ` 
        : "";
      
      userContext = `
USER PROFILE:
- Username: ${profile?.username || "Traveler"} ${greeting ? `(${greeting})` : ""}
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

    // Extract user query details for smart search (cucine + contesti come "festa")
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const queryLower = lastUserMessage.toLowerCase();
    
    // ===== INTENT DETECTION SYSTEM =====
    const detectIntent = (query: string): { mode: string; context: string } => {
      const q = query.toLowerCase();
      
      // Itinerary / Route planning
      if (/\b(itinerary|percorso|giro|tour|route|day trip|giornata|weekend)\b/i.test(q)) {
        return { mode: 'itinerary', context: 'User wants a multi-stop route or day plan' };
      }
      
      // Romantic / Date
      if (/\b(romantic|romantica?|date|appuntamento|cena romantica|anniversary|anniversario)\b/i.test(q)) {
        return { mode: 'romantic', context: 'User is planning a romantic date' };
      }
      
      // Family / Kids
      if (/\b(family|famiglia|kids|bambini|children|kid-friendly|family-friendly)\b/i.test(q)) {
        return { mode: 'family', context: 'User is looking for family-friendly options' };
      }
      
      // Budget / Cheap
      if (/\b(budget|cheap|economico|low cost|inexpensive|affordable|poco costoso)\b/i.test(q)) {
        return { mode: 'budget', context: 'User wants budget-friendly options' };
      }
      
      // What to do now / Spontaneous
      if (/\b(now|adesso|ora|tonight|stasera|oggi|today|right now|nearby|vicino)\b/i.test(q)) {
        return { mode: 'spontaneous', context: 'User wants immediate/nearby suggestions' };
      }
      
      // Friends' spots
      if (/\b(friends?|amici|what.*saved|dove.*salvato|consiglia|recommend)\b/i.test(q)) {
        return { mode: 'social', context: 'User wants friend recommendations' };
      }
      
      // Party / Night out (existing)
      if (/\b(festa|serata fuori|party|serata|notte|night out|aperitivo|apericena|club|discoteca)\b/i.test(q)) {
        return { mode: 'nightlife', context: 'User wants nightlife/party options' };
      }
      
      // Default discovery
      return { mode: 'discover', context: 'General place discovery' };
    };
    
    const detectedIntent = detectIntent(queryLower);
    console.log(`Detected intent: ${detectedIntent.mode} - ${detectedIntent.context}`);
    
    // ===== TIME/LOCATION CONTEXT =====
    let timeLocationContext = "";
    if (currentTime || currentLocation) {
      const parts: string[] = [];
      
      if (currentTime) {
        const hour = new Date(currentTime).getHours();
        let timeOfDay = "daytime";
        if (hour >= 5 && hour < 12) timeOfDay = "morning";
        else if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
        else if (hour >= 17 && hour < 21) timeOfDay = "evening";
        else timeOfDay = "night";
        
        parts.push(`Current time: ${new Date(currentTime).toLocaleTimeString()} (${timeOfDay})`);
        
        // Add time-based suggestions
        if (timeOfDay === "morning") {
          parts.push("Great for: cafes, breakfast spots, bakeries");
        } else if (timeOfDay === "afternoon") {
          parts.push("Great for: lunch spots, museums, sightseeing");
        } else if (timeOfDay === "evening") {
          parts.push("Great for: restaurants, aperitivo bars, dinner spots");
        } else {
          parts.push("Great for: bars, nightclubs, late-night food");
        }
      }
      
      if (currentLocation?.latitude && currentLocation?.longitude) {
        parts.push(`User coordinates: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`);
        parts.push("Can provide walking distances from user's position");
      }
      
      if (timezone) {
        parts.push(`Timezone: ${timezone}`);
      }
      
      timeLocationContext = `\n\nREAL-TIME CONTEXT:\n${parts.join('\n')}`;
    }
    
    // Check if user is asking about specific food/cuisine
    const cuisineMatch = queryLower.match(/\b(italian|mexican|japanese|chinese|thai|indian|french|korean|vietnamese|greek|spanish|turkish|lebanese|brazilian|peruvian|messican[oa]|italiano|giapponese|cinese|taco|burrito|margarita|pizza|pasta|sushi|curry)\b/i);
    const cityMatch = queryLower.match(/\b(?:in|a|ad|at)\s+([a-z\s]+?)(?:\s|$|,|\?)/i);
    
    // Rileva contesti "party" / "festa" per usare esplicitamente i tuoi luoghi per uscire la sera
    const isPartyContext = detectedIntent.mode === 'nightlife';
    
    let smartSearchContext = "";
    
    // 1) Se il contesto è "festa", costruisci un blocco di luoghi per uscire la sera (tuoi + amici)
    if (isPartyContext) {
      const targetCityRaw = cityMatch?.[1]?.trim() || null;
      const targetCity = targetCityRaw ? targetCityRaw.toLowerCase() : null;
      
      const normalizeCityName = (value: string | null | undefined) => {
        if (!value) return null;
        let c = value.toLowerCase().split(',')[0];

        // Remove postal district numbers, e.g. "Dublin 2" -> "dublin"
        c = c.replace(/\s+\d+$/g, '');

        // Remove "county" prefix
        c = c.replace(/^county\s+/g, '').trim();

        // Basic Italian → English mappings for frequent cities
        const italianToEnglish: { [key: string]: string } = {
          dublino: 'dublin',
          londra: 'london',
          parigi: 'paris',
          berlino: 'berlin',
          lisbona: 'lisbon',
          praga: 'prague',
        };

        if (italianToEnglish[c]) {
          c = italianToEnglish[c];
        }

        return c;
      };

      const normalizedTargetCity = normalizeCityName(targetCity);
      
      const filterByCity = (city?: string | null) => {
        if (!normalizedTargetCity) return true;
        const normalizedCity = normalizeCityName(city);
        if (!normalizedCity) return false;
        return normalizedCity === normalizedTargetCity;
      };
      
      const isPartyTag = (tags: string[] = []) => {
        const lower = tags.map(t => t.toLowerCase());
        return (
          lower.includes('night_out') ||
          lower.includes('nightout') ||
          lower.includes('party') ||
          lower.includes('serata') ||
          lower.includes('festa') ||
          lower.includes('aperitivo') ||
          lower.includes('apericena')
        );
      };
      
      const isPartyCategory = (category?: string | null) => {
        if (!category) return false;
        const c = category.toLowerCase();
        return /(bar|club|pub|night|cocktail|discoteca|lounge)/.test(c);
      };
      
      const userSavesNormalized = [
        ...(savedPlaces || []).map(p => ({ 
          name: p.place_name,
          category: p.place_category,
          city: p.city,
          google_place_id: (p as any).google_place_id || p.place_id,
          internal_id: null as string | null,
          tags: (p as any).save_tag ? [((p as any).save_tag as string)] : []
        })),
        ...(savedLocations || []).map(l => ({
          name: l.locations?.name,
          category: l.locations?.category,
          city: l.locations?.city,
          google_place_id: l.locations?.google_place_id as string | null,
          internal_id: l.locations?.id as string | null,
          tags: (l as any).save_tag ? [((l as any).save_tag as string)] : []
        }))
      ];
      
      const friendsSavesNormalized = (friendsPlaces || []).map(p => ({
        name: p.name,
        category: p.category,
        city: p.city,
        google_place_id: p.google_place_id as string | null,
        internal_id: p.internal_id as string | null,
        friendUsername: p.friendUsername,
        user_id: p.user_id,
        tags: Array.isArray(p.tags) ? p.tags : []
      }));
      
      const userPartyCandidates = userSavesNormalized.filter(p =>
        p.name && filterByCity(p.city) && (isPartyTag(p.tags) || isPartyCategory(p.category))
      );
      
      const friendPartyCandidates = friendsSavesNormalized.filter(p =>
        p.name && filterByCity(p.city) && (isPartyTag(p.tags) || isPartyCategory(p.category))
      );
      
      const fallbackUser = userSavesNormalized.filter(p => p.name && filterByCity(p.city));
      const fallbackFriends = friendsSavesNormalized.filter(p => p.name && filterByCity(p.city));
      
      const finalUserList = userPartyCandidates.length > 0 ? userPartyCandidates : fallbackUser;
      const finalFriendList = friendPartyCandidates.length > 0 ? friendPartyCandidates : fallbackFriends;
      
      const partyPlacesLines: string[] = [];
      
      if (finalFriendList.length > 0) {
        partyPlacesLines.push(`LUOGHI SALVATI DAI TUOI AMICI PER USCIRE LA SERA${targetCity ? ` A ${targetCity.toUpperCase()}` : ''}:`);
        partyPlacesLines.push(
          ...finalFriendList.slice(0, 8).map(p => {
            const id = p.google_place_id || (p.internal_id ? `internal:${p.internal_id}` : p.name);
            return `- [PLACE:${p.name}|${id}] (${p.category || 'night_out'}) - salvato da [USER:${p.friendUsername}|${p.user_id || 'unknown'}]`;
          })
        );
      }
      
      if (finalUserList.length > 0) {
        partyPlacesLines.push(`\nI TUOI LUOGHI SALVATI PER USCIRE LA SERA${targetCity ? ` A ${targetCity.toUpperCase()}` : ''}:`);
        partyPlacesLines.push(
          ...finalUserList.slice(0, 8).map(p => {
            const id = p.google_place_id || (p.internal_id ? `internal:${p.internal_id}` : p.name);
            return `- [PLACE:${p.name}|${id}] (${p.category || 'night_out'})`;
          })
        );
      }
      
      if (partyPlacesLines.length > 0) {
        smartSearchContext = `\n\nPARTY/NIGHT_OUT CONTEXT:\n${partyPlacesLines.join('\n')}`;
      }
    }
    
    // 2) Smart search per cucine specifiche (lasciata com'era, ma usa anche smartSearchContext esistente)
    if (!smartSearchContext && cuisineMatch && cityMatch) {
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
  const placeId = `internal:${loc.id}`;
  return `- [PLACE:${loc.name}|${placeId}]${keywords}${users}${userIds}${comments}`;
}).join('\n')}

IMPORTANT: Focus your suggestions on places from this list. When mentioning a place, also mention the user who recommended it using [USER:username|user_id] format. If you suggest a place that is not in this list, describe it as an interesting option to explore.`;
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
    
    const greetingFormattingRule = isFirstMessage
      ? "1. GREETING FOR FIRST MESSAGE ONLY: For this FIRST reply in the conversation, start your response with a short greeting using the Username from USER PROFILE in the user's language (for Italian, use 'Ciao username')."
      : "1. NO GREETING IN FOLLOW-UP: This is NOT the first reply, so do NOT start with any greeting like 'Ciao username'. Start directly with the answer without any opening greeting.";

    const greetingResponseGuideline = isFirstMessage
      ? "1. START WITH GREETING (only this first time): Greet the user with their username in the user's language, then continue with your answer."
      : "1. NO GREETING THIS TIME: Do not greet again. Start immediately with the content of your answer without saying 'Ciao username' or similar.";
    
    // ===== MODE-SPECIFIC INSTRUCTIONS =====
    const getModeInstructions = (mode: string): string => {
      const modes: Record<string, string> = {
        itinerary: `MODE: ITINERARY PLANNING
- Create a logical route with 3-5 stops
- Order by proximity and flow (e.g., morning cafe → lunch → museum → dinner)
- Include estimated walking times between stops
- Suggest optimal timing for each stop`,
        
        romantic: `MODE: ROMANTIC DATE
- Focus on atmosphere, ambiance, intimate settings
- Prioritize places tagged as [romantic], [date], [intimate]
- Consider candlelit, rooftop, garden, or waterfront venues
- Suggest wine bars, fine dining, scenic walks`,
        
        family: `MODE: FAMILY-FRIENDLY
- Focus on kid-friendly venues
- Prioritize places tagged as [family], [kids]
- Consider outdoor spaces, casual dining, attractions
- Mention stroller accessibility, play areas`,
        
        budget: `MODE: BUDGET-FRIENDLY
- Focus on affordable options
- Prioritize places with good value
- Mention happy hours, lunch specials, free attractions
- Compare price ranges when possible`,
        
        spontaneous: `MODE: WHAT TO DO NOW
- Prioritize OPEN NOW based on current time
- Focus on NEARBY options (use coordinates if available)
- Consider time-appropriate suggestions (cafes in morning, bars at night)
- Keep suggestions immediate and actionable`,
        
        social: `MODE: FRIENDS' RECOMMENDATIONS
- PRIORITIZE friends' saved places HEAVILY
- Always mention which friend saved each place
- Group by friends who share similar tastes
- Highlight places multiple friends have saved`,
        
        nightlife: `MODE: NIGHTLIFE & PARTY
- Focus on bars, clubs, cocktail lounges
- Prioritize places tagged as [night_out], [party], [aperitivo]
- Consider current time for venue suggestions
- Mention vibe (chill, energetic, dancing)`,
        
        discover: `MODE: GENERAL DISCOVERY
- Balance personal preferences with new discoveries
- Mix familiar categories with new experiences
- Highlight trending or popular spots
- Consider friends' recent saves`
      };
      
      return modes[mode] || modes.discover;
    };
    
    const modeInstructions = getModeInstructions(detectedIntent.mode);
    
    const systemPrompt = `You are a knowledgeable, friendly travel assistant AI integrated into Spott, a social travel discovery app. Your goal is to help users discover amazing places based on their preferences, past saves, and social connections.

${languageInstruction}

${modeInstructions}

CONTEXT:
${userContext}${smartSearchContext}${timeLocationContext}

CRITICAL FORMATTING RULES:
${greetingFormattingRule}
2. When mentioning places from the database, wrap them EXACTLY like this: [PLACE:place_name|place_id]
   - Example: "Ti consiglio [PLACE:Masa Drury St|ChIJ123abc] per i tacos"
3. When mentioning users who reviewed/posted, use: [USER:username|user_id]
   - Example: "[USER:fratrinky|uuid-123] dice che fanno ottimi margaritas!"
4. NEVER use asterisks (**) around place or user names
5. Write naturally, then wrap ONLY names in [PLACE:name|id] or [USER:username|id]
6. If a place is NOT in verified list, say: "Potresti essere il primo su Spott a provare [place name]!"

PERSONALIZED EXPLANATIONS (CRITICAL):
- For EVERY suggestion, explain WHY it matches the user's taste
- Reference specific data: "Based on your love for ${Object.keys(categoryPreferences).slice(0, 2).join(' and ')}"
- Mention friends: "Your friend @username saved this" or "3 of your friends have been here"
- Reference past behavior: "Similar to [saved place] which you rated highly"
- If time context available, explain timing: "Perfect for evening drinks based on current time"

RESPONSE GUIDELINES:
${greetingResponseGuideline}
2. KEEP IT CONCISE: 3-5 suggestions max, each with a brief WHY explanation
3. Use "luoghi salvati" not "mi piace" when talking about user's saves
4. CRITICAL - USE SAVE_TAGS FOR RECOMMENDATIONS (especially from friends):
   - Match query context to tags: family, romantic, night_out, aperitivo, etc.
   - When recommending a friend's place: "Il tuo amico [USER:username|user_id] ha salvato [PLACE:name|id]"
5. ALWAYS cite users who posted/reviewed
6. PRIORITIZE verified database locations over generic suggestions
7. Use emojis sparingly (max 1-2 per response)
8. Be warm, enthusiastic, and PERSONALIZED

Remember: Every suggestion should feel PERSONALIZED, not generic. Explain the connection to user's data.`;

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
