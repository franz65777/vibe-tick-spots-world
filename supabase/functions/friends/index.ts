import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schemas
const friendRequestSchema = z.object({
  requestedUserId: z.string().uuid()
})

const acceptRequestSchema = z.object({
  requestId: z.string().uuid()
})

const blockUserSchema = z.object({
  userId: z.string().uuid()
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
    const action = pathParts[pathParts.length - 1] // Get the last part of the path

    console.log('Friend request action:', action, 'Method:', req.method)

    switch (`${req.method}:${action}`) {
      case 'POST:request': {
        const body = await req.json()
        const validation = friendRequestSchema.safeParse(body)
        
        if (!validation.success) {
          return new Response(JSON.stringify({ 
            error: 'Invalid input', 
            details: validation.error.issues 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { requestedUserId } = validation.data

        // Check if request already exists
        const { data: existingRequest } = await supabaseClient
          .from('friend_requests')
          .select('*')
          .eq('requester_id', user.id)
          .eq('requested_id', requestedUserId)
          .single()

        if (existingRequest) {
          return new Response(JSON.stringify({ error: 'Friend request already sent' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Create friend request
        const { data: friendRequest, error } = await supabaseClient
          .from('friend_requests')
          .insert({
            requester_id: user.id,
            requested_id: requestedUserId,
            status: 'pending'
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating friend request:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        // Create notification for requested user
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: requestedUserId,
            type: 'friend_request',
            title: 'New Friend Request',
            message: 'You have a new friend request!',
            data: { requester_id: user.id, request_id: friendRequest.id }
          })

        return new Response(JSON.stringify({ success: true, data: friendRequest }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'POST:accept': {
        const body = await req.json()
        const validation = acceptRequestSchema.safeParse(body)
        
        if (!validation.success) {
          return new Response(JSON.stringify({ 
            error: 'Invalid input', 
            details: validation.error.issues 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { requestId } = validation.data

        const { data: friendRequest, error } = await supabaseClient
          .from('friend_requests')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', requestId)
          .eq('requested_id', user.id)
          .select()
          .single()

        if (error) {
          console.error('Error accepting friend request:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ success: true, data: friendRequest }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'POST:block': {
        const body = await req.json()
        const validation = blockUserSchema.safeParse(body)
        
        if (!validation.success) {
          return new Response(JSON.stringify({ 
            error: 'Invalid input', 
            details: validation.error.issues 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { userId } = validation.data

        // Update or create blocked status
        const { data: blockedRequest, error } = await supabaseClient
          .from('friend_requests')
          .upsert({
            requester_id: userId,
            requested_id: user.id,
            status: 'blocked',
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Error blocking user:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ success: true, data: blockedRequest }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'GET:requests': {
        const { data: requests, error } = await supabaseClient
          .from('friend_requests')
          .select(`
            *,
            requester:profiles!friend_requests_requester_id_fkey(id, username, full_name, avatar_url)
          `)
          .eq('requested_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching friend requests:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ data: requests }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'GET:list': {
        const { data: friends, error } = await supabaseClient
          .from('friend_requests')
          .select(`
            *,
            requester:profiles!friend_requests_requester_id_fkey(id, username, full_name, avatar_url),
            requested:profiles!friend_requests_requested_id_fkey(id, username, full_name, avatar_url)
          `)
          .or(`requester_id.eq.${user.id},requested_id.eq.${user.id}`)
          .eq('status', 'accepted')
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('Error fetching friends list:', error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ data: friends }), {
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
