import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Multiple Lingva instances for fallback reliability
const LINGVA_INSTANCES = [
  "https://lingva.ml",
  "https://lingva.pussthecat.org",
  "https://translate.plausibility.cloud",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage } = await req.json();
    
    console.log(`Translating text to ${targetLanguage}`);
    console.log(`Text length: ${text?.length || 0} characters`);

    if (!text || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing text or targetLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try each instance until one works
    let translatedText = null;
    let lastError = null;

    for (const instance of LINGVA_INSTANCES) {
      try {
        const url = `${instance}/api/v1/auto/${targetLanguage}/${encodeURIComponent(text)}`;
        console.log(`Trying instance: ${instance}`);
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          translatedText = data.translation;
          console.log(`Translation successful from ${instance}`);
          break;
        }
      } catch (error) {
        lastError = error;
        console.log(`Instance ${instance} failed, trying next...`);
      }
    }

    if (!translatedText) {
      throw lastError || new Error("All translation instances failed");
    }

    console.log(`Translation successful, result length: ${translatedText.length}`);

    return new Response(
      JSON.stringify({ translatedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
