
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'like' | 'comment' | 'follow' | 'location' | 'share';
  recipientId: string;
  senderId: string;
  message: string;
  relatedId?: string; // place_id, comment_id, etc.
  metadata?: any;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Notification function called with method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { type, recipientId, senderId, message, relatedId, metadata }: NotificationRequest = await req.json();

    console.log('Creating notification:', { type, recipientId, senderId, message });

    // Insert notification into database
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        type,
        recipient_id: recipientId,
        sender_id: senderId,
        message,
        related_id: relatedId,
        metadata: metadata || {},
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    console.log('Notification created successfully:', notification);

    return new Response(
      JSON.stringify({ success: true, notification }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
