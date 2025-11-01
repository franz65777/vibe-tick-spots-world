import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { receiverId, audioData } = await req.json();

    if (!receiverId || !audioData) {
      throw new Error('Missing required fields');
    }

    console.log('Processing audio message from:', user.id, 'to:', receiverId);

    // Decode base64 audio
    const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${user.id}_${timestamp}.webm`;
    const filePath = `audio-messages/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from('messages')
      .upload(filePath, audioBytes, {
        contentType: 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('messages')
      .getPublicUrl(filePath);

    console.log('Audio uploaded to:', publicUrl);

    // Create message in database
    const { data: message, error: messageError } = await supabaseClient
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content: '[Audio Message]',
        message_type: 'audio',
        shared_content: { audio_url: publicUrl },
      })
      .select()
      .single();

    if (messageError) {
      console.error('Message insert error:', messageError);
      throw messageError;
    }

    console.log('Message created:', message.id);

    return new Response(
      JSON.stringify({ success: true, message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in upload-audio-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
