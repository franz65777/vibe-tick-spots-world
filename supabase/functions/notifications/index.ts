import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const sendNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional().default({})
})

const broadcastNotificationSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(1000),
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.any()).optional().default({})
})

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1)
})

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
        const body = await req.json()
        const validation = sendNotificationSchema.safeParse(body)
        
        if (!validation.success) {
          return new Response(JSON.stringify({ 
            error: 'Invalid input', 
            details: validation.error.issues 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { userId, type, title, message, data } = validation.data

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
        const body = await req.json()
        const validation = broadcastNotificationSchema.safeParse(body)
        
        if (!validation.success) {
          return new Response(JSON.stringify({ 
            error: 'Invalid input', 
            details: validation.error.issues 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { userIds, type, title, message, data } = validation.data

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
        // Support cursor-based pagination
        const cursorParam = url.searchParams.get('cursor');
        const limitParam = url.searchParams.get('limit');
        const limit = Math.min(parseInt(limitParam || '50'), 100); // Max 100 items

        let query = supabaseClient
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        // Apply cursor filter if provided
        if (cursorParam) {
          query = query.lt('created_at', cursorParam);
        }

        const { data: notifications, error } = await query.limit(limit);

        if (error) {
          console.error('Error fetching notifications:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Calculate next cursor
        const hasMore = notifications.length === limit;
        const nextCursor = hasMore && notifications.length > 0 
          ? notifications[notifications.length - 1].created_at 
          : null;

        return new Response(JSON.stringify({ 
          data: notifications,
          nextCursor,
          hasMore,
        }), {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            // Short cache for user-specific data
            'Cache-Control': 'private, max-age=10',
          },
        })
      }

      case 'PUT:read': {
        const body = await req.json()
        const validation = markReadSchema.safeParse(body)
        
        if (!validation.success) {
          return new Response(JSON.stringify({ 
            error: 'Invalid input', 
            details: validation.error.issues 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { notificationIds } = validation.data

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
