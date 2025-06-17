
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const action = pathParts[pathParts.length - 1]

    console.log('Notification action:', action, 'Method:', req.method)

    switch (`${req.method}:${action}`) {
      case 'POST:send': {
        const { userId, type, title, message, data = {} } = await req.json()
        
        if (!userId || !type || !title || !message) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { data: notification, error } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: userId,
            type,
            title,
            message,
            data
          })
          .select()
          .single()

        if (error) {
          console.error('Error sending notification:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ success: true, data: notification }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'POST:broadcast': {
        const { userIds, type, title, message, data = {} } = await req.json()
        
        if (!userIds || !Array.isArray(userIds) || !type || !title || !message) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const notifications = userIds.map(userId => ({
          user_id: userId,
          type,
          title,
          message,
          data
        }))

        const { data: createdNotifications, error } = await supabaseClient
          .from('notifications')
          .insert(notifications)
          .select()

        if (error) {
          console.error('Error broadcasting notifications:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ 
          success: true, 
          data: createdNotifications,
          count: createdNotifications.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'GET:user': {
        const { data: notifications, error } = await supabaseClient
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) {
          console.error('Error fetching notifications:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ data: notifications }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'PUT:read': {
        const { notificationIds } = await req.json()
        
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return new Response(JSON.stringify({ error: 'Missing notificationIds array' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { data: updatedNotifications, error } = await supabaseClient
          .from('notifications')
          .update({ is_read: true })
          .in('id', notificationIds)
          .eq('user_id', user.id)
          .select()

        if (error) {
          console.error('Error marking notifications as read:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ 
          success: true, 
          data: updatedNotifications,
          count: updatedNotifications.length 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
