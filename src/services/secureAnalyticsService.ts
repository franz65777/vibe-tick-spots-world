import { supabase } from '@/integrations/supabase/client';

export interface SecureAnalyticsEvent {
  event_type: string;
  event_data: Record<string, any>;
  page_url?: string;
  session_id?: string;
}

export const trackSecureEvent = async (eventData: SecureAnalyticsEvent) => {
  try {
    // Privacy-first analytics tracking with automatic anonymization
    const { data, error } = await supabase
      .from('user_analytics')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: eventData.event_type,
        event_data: {
          // Only track essential non-sensitive data
          ...Object.fromEntries(
            Object.entries(eventData.event_data || {}).filter(([key]) => 
              !['email', 'phone', 'name', 'address', 'ip'].includes(key.toLowerCase())
            )
          )
        },
        page_url: eventData.page_url?.split('?')[0], // Remove query params
        session_id: eventData.session_id, // Will be automatically anonymized by trigger
        // IP address will be automatically anonymized by database trigger
      });

    if (error) {
      console.error('Error tracking secure event:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Secure analytics error:', error);
    return false;
  }
};

export const getSecureAnalytics = async (userId?: string) => {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
    
    if (!targetUserId) {
      return [];
    }

    // Use the secure function that excludes IP addresses
    const { data, error } = await supabase
      .rpc('get_anonymized_analytics', { target_user_id: targetUserId });

    if (error) {
      console.error('Error fetching secure analytics:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Secure analytics fetch error:', error);
    return [];
  }
};