import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // MyMemory API - free translation service (5000 chars/day anonymous, 50000 with email)
    // Using English as source since campaign descriptions are typically in English
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`;
    
    console.log(`Calling MyMemory API for translation to ${targetLanguage}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.responseStatus !== 200) {
      throw new Error(data.responseDetails || "Translation failed");
    }
    
    const translatedText = data.responseData?.translatedText;
    
    if (!translatedText) {
      throw new Error("No translation received");
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
