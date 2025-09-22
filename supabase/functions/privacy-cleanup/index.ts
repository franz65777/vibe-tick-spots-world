import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('Privacy cleanup function loaded')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Privacy cleanup function invoked')
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Run comprehensive data cleanup
    console.log('Starting privacy data cleanup...')
    
    // 1. Clean up old analytics data (older than 30 days)
    const { error: analyticsError } = await supabaseClient
      .from('user_analytics')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    if (analyticsError) {
      console.error('Error cleaning analytics:', analyticsError)
    } else {
      console.log('Analytics data cleanup completed')
    }

    // 2. Clean up old error logs (older than 7 days)
    const { error: errorLogsError } = await supabaseClient
      .from('error_logs')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    if (errorLogsError) {
      console.error('Error cleaning error logs:', errorLogsError)
    } else {
      console.log('Error logs cleanup completed')
    }

    // 3. Clean up old API usage data (older than 30 days)
    const { error: apiUsageError } = await supabaseClient
      .from('api_usage')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    
    if (apiUsageError) {
      console.error('Error cleaning API usage:', apiUsageError)
    } else {
      console.log('API usage cleanup completed')
    }

    // 4. Clean up old performance metrics (older than 7 days)
    const { error: performanceError } = await supabaseClient
      .from('performance_metrics')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    
    if (performanceError) {
      console.error('Error cleaning performance metrics:', performanceError)
    } else {
      console.log('Performance metrics cleanup completed')
    }

    // 5. Clean up old search history (older than 90 days)
    const { error: searchError } = await supabaseClient
      .from('search_history')
      .delete()
      .lt('searched_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    
    if (searchError) {
      console.error('Error cleaning search history:', searchError)
    } else {
      console.log('Search history cleanup completed')
    }

    // 6. Clean up expired stories
    const { error: storiesError } = await supabaseClient
      .from('stories')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (storiesError) {
      console.error('Error cleaning expired stories:', storiesError)
    } else {
      console.log('Expired stories cleanup completed')
    }

    // 7. Clean up expired notifications
    const { error: notificationsError } = await supabaseClient
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (notificationsError) {
      console.error('Error cleaning expired notifications:', notificationsError)
    } else {
      console.log('Expired notifications cleanup completed')
    }

    // 8. Clean up old pending friend requests (older than 90 days)
    const { error: friendRequestsError } = await supabaseClient
      .from('friend_requests')
      .delete()
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    
    if (friendRequestsError) {
      console.error('Error cleaning friend requests:', friendRequestsError)
    } else {
      console.log('Old friend requests cleanup completed')
    }

    console.log('Privacy cleanup function completed successfully')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Privacy cleanup completed successfully',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Privacy cleanup function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})