import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedPlace {
  name: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  category?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No URLs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${urls.length} Google Maps URLs`);

    const allPlaces: ExtractedPlace[] = [];

    for (const url of urls) {
      if (!url || typeof url !== 'string') continue;

      try {
        // Validate URL is a Google Maps URL
        if (!url.includes('google.com/maps') && !url.includes('maps.app.goo.gl') && !url.includes('goo.gl/maps')) {
          console.log(`Skipping non-Google Maps URL: ${url}`);
          continue;
        }

        // Fetch the page content
        let finalUrl = url;
        
        // Handle short URLs by following redirects
        if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
          try {
            const redirectResponse = await fetch(url, { redirect: 'follow' });
            finalUrl = redirectResponse.url;
            console.log(`Resolved short URL to: ${finalUrl}`);
          } catch (e) {
            console.error(`Failed to resolve short URL: ${url}`, e);
          }
        }

        // Fetch the page HTML
        const response = await fetch(finalUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          }
        });

        const html = await response.text();
        console.log(`Fetched HTML length: ${html.length}`);

        // Extract places from the HTML
        const places = extractPlacesFromHtml(html, finalUrl);
        console.log(`Extracted ${places.length} places from URL`);
        
        allPlaces.push(...places);
      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
      }
    }

    // Deduplicate places by name
    const uniquePlaces = allPlaces.reduce((acc: ExtractedPlace[], place) => {
      if (!acc.find(p => p.name.toLowerCase() === place.name.toLowerCase())) {
        acc.push(place);
      }
      return acc;
    }, []);

    console.log(`Returning ${uniquePlaces.length} unique places`);

    return new Response(
      JSON.stringify({ places: uniquePlaces }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-google-maps-list:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to extract places from URLs' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractPlacesFromHtml(html: string, url: string): ExtractedPlace[] {
  const places: ExtractedPlace[] = [];

  try {
    // Try to extract from JSON-LD structured data
    const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonStr = match.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
          const data = JSON.parse(jsonStr);
          if (data['@type'] === 'LocalBusiness' || data['@type'] === 'Restaurant' || data['@type'] === 'Place') {
            places.push({
              name: data.name,
              address: data.address?.streetAddress,
              city: data.address?.addressLocality,
              lat: data.geo?.latitude,
              lng: data.geo?.longitude,
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    // Try to extract from meta tags
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1];
      // Check if this looks like a list (contains multiple places)
      if (title.includes(' - Google Maps')) {
        const placeName = title.replace(' - Google Maps', '').trim();
        if (placeName && !places.find(p => p.name === placeName)) {
          places.push({ name: placeName });
        }
      }
    }

    // Extract coordinates from URL
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch && places.length > 0) {
      places[0].lat = parseFloat(coordMatch[1]);
      places[0].lng = parseFloat(coordMatch[2]);
    }

    // Try to extract place names from list view patterns
    // Look for patterns like "placeName · Rating" or quoted place names
    const placePatterns = [
      /"name":"([^"]+)"/g,
      /\["([^"]{3,50})","[^"]*","[^"]*",\[(-?\d+\.\d+),(-?\d+\.\d+)\]/g,
      /data-tooltip="([^"]+)"/g,
    ];

    for (const pattern of placePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const name = match[1];
        // Filter out generic names and UI elements
        if (name && 
            name.length > 2 && 
            name.length < 100 &&
            !name.includes('Google') &&
            !name.includes('Maps') &&
            !name.includes('function') &&
            !name.includes('var ') &&
            !name.includes('{') &&
            !name.startsWith('http')) {
          
          const existingPlace = places.find(p => p.name.toLowerCase() === name.toLowerCase());
          if (!existingPlace) {
            const place: ExtractedPlace = { name };
            if (match[2] && match[3]) {
              place.lat = parseFloat(match[2]);
              place.lng = parseFloat(match[3]);
            }
            places.push(place);
          }
        }
      }
    }

    // Limit to prevent overwhelming results
    return places.slice(0, 100);
  } catch (error) {
    console.error('Error extracting places from HTML:', error);
    return places;
  }
}
