import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationData {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  city?: string;
}

interface ExtractResult {
  success: boolean;
  location?: LocationData;
  mediaUrl?: string;
  caption?: string;
  error?: string;
}

// Extract Instagram location from URL
async function extractInstagramLocation(url: string): Promise<ExtractResult> {
  console.log('Extracting from Instagram URL:', url);
  
  try {
    // Try Instagram's oEmbed API first for basic info
    const oEmbedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    const oEmbedResponse = await fetch(oEmbedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    let mediaUrl: string | undefined;
    let caption: string | undefined;
    
    if (oEmbedResponse.ok) {
      const oEmbedData = await oEmbedResponse.json();
      console.log('oEmbed data:', oEmbedData);
      mediaUrl = oEmbedData.thumbnail_url;
      caption = oEmbedData.title;
    }

    // Try to fetch the actual page to extract location
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    
    if (!pageResponse.ok) {
      console.log('Page fetch failed:', pageResponse.status);
      return {
        success: false,
        error: 'Could not fetch Instagram post. Try copying the location name manually.',
        mediaUrl,
        caption,
      };
    }

    const html = await pageResponse.text();
    
    // Try to extract location from various patterns in the HTML
    let locationName: string | undefined;
    let locationAddress: string | undefined;
    
    // Look for location in meta tags
    const locationMetaMatch = html.match(/"location_name"\s*:\s*"([^"]+)"/);
    if (locationMetaMatch) {
      locationName = locationMetaMatch[1];
      console.log('Found location name:', locationName);
    }
    
    // Look for location in structured data
    const locationJsonMatch = html.match(/"location"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
    if (!locationName && locationJsonMatch) {
      locationName = locationJsonMatch[1];
      console.log('Found location from JSON:', locationName);
    }
    
    // Look for contentLocation in structured data
    const contentLocationMatch = html.match(/"contentLocation"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/);
    if (!locationName && contentLocationMatch) {
      locationName = contentLocationMatch[1];
      console.log('Found contentLocation:', locationName);
    }

    // Try to extract address/city
    const addressMatch = html.match(/"address"\s*:\s*\{[^}]*"addressLocality"\s*:\s*"([^"]+)"/);
    if (addressMatch) {
      locationAddress = addressMatch[1];
    }

    // Extract media URL from meta og:image if not found yet
    if (!mediaUrl) {
      const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
      if (ogImageMatch) {
        mediaUrl = ogImageMatch[1];
      }
    }

    // Extract caption from meta description if not found yet
    if (!caption) {
      const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
      if (descMatch) {
        caption = descMatch[1];
      }
    }

    if (locationName) {
      return {
        success: true,
        location: {
          name: locationName,
          address: locationAddress,
          city: locationAddress,
        },
        mediaUrl,
        caption,
      };
    }

    return {
      success: false,
      error: 'No location found in this post. The post may not have a tagged location.',
      mediaUrl,
      caption,
    };
    
  } catch (error) {
    console.error('Instagram extraction error:', error);
    return {
      success: false,
      error: 'Failed to extract data from Instagram. Try copying the location name manually.',
    };
  }
}

// Generic social media URL handler
async function extractSocialLocation(url: string): Promise<ExtractResult> {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('instagram.com')) {
    return extractInstagramLocation(url);
  }
  
  // Add more platforms here in the future (TikTok, etc.)
  
  return {
    success: false,
    error: 'Unsupported platform. Currently only Instagram is supported.',
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Processing social media URL:', url);
    const result = await extractSocialLocation(url);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
