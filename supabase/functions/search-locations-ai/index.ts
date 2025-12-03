import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, searchContext, query } = await req.json();
    
    // searchContext is an array of previous refinements: ["Milan", "art museum", "modern art"]
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the search prompt from context
    const contextDescription = searchContext.length > 0 
      ? `Previous search context: ${searchContext.join(' → ')}. `
      : '';
    
    const systemPrompt = `You are a location search assistant. Given a city and search refinements, generate 3-5 specific search keywords that would help find relevant locations on OpenStreetMap/Photon API.

Output ONLY a JSON array of search terms, no explanation. Example:
["modern art gallery", "contemporary museum", "art exhibition"]

Focus on:
- Specific place types that match the refinement
- Combine city context with user's interests
- Use terms that work well with geocoding APIs`;

    const userPrompt = `City: ${city}
${contextDescription}
New query: "${query}"

Generate search terms that combine all context to find specific locations.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', searchTerms: [query] }), {
          status: 200, // Return 200 with fallback
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI gateway error:', response.status);
      return new Response(JSON.stringify({ searchTerms: [query] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    // Parse AI response - extract JSON array
    let searchTerms: string[] = [query];
    try {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        searchTerms = JSON.parse(match[0]);
      }
    } catch (e) {
      console.log('Failed to parse AI response, using original query');
    }

    return new Response(
      JSON.stringify({ searchTerms, aiEnhanced: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('search-locations-ai error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error', searchTerms: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
