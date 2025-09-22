
import { supabase } from '@/integrations/supabase/client';

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_description?: string;
  website_url?: string;
  phone_number?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  subscription_plan?: string;
  subscription_started_at?: string;
  subscription_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LocationClaim {
  id: string;
  business_id: string;
  location_id: string;
  claimed_at: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_documents?: any;
}

export interface BusinessNotification {
  id: string;
  business_id: string;
  location_id: string;
  title: string;
  message: string;
  notification_type: 'event' | 'discount' | 'announcement' | 'special_offer';
  scheduled_time?: string;
  sent_time?: string;
  recipient_count: number;
  open_count: number;
  is_sent: boolean;
  created_at: string;
  metadata?: any;
}

export const createBusinessProfile = async (profileData: Omit<BusinessProfile, 'id' | 'created_at' | 'updated_at'>): Promise<BusinessProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('Error creating business profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Business profile creation error:', error);
    return null;
  }
};

export const getBusinessProfile = async (userId: string): Promise<BusinessProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching business profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Business profile fetch error:', error);
    return null;
  }
};

// Secure function to get public business data (no sensitive info)
export const getPublicBusinessData = async (businessId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_safe_business_data', { business_id: businessId });

    if (error) {
      console.error('Error fetching public business data:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Public business data fetch error:', error);
    return null;
  }
};

export const claimLocation = async (businessId: string, locationId: string): Promise<LocationClaim | null> => {
  try {
    const { data, error } = await supabase
      .from('location_claims')
      .insert({
        business_id: businessId,
        location_id: locationId
      })
      .select()
      .single();

    if (error) {
      console.error('Error claiming location:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Location claim error:', error);
    return null;
  }
};

export const sendBusinessNotification = async (notificationData: Omit<BusinessNotification, 'id' | 'created_at' | 'recipient_count' | 'open_count' | 'is_sent'>): Promise<BusinessNotification | null> => {
  try {
    // Mock recipient count for now since we don't have user_saved_locations table yet
    const mockRecipientCount = Math.floor(Math.random() * 100) + 10;

    const { data, error } = await supabase
      .from('business_notifications')
      .insert({
        ...notificationData,
        recipient_count: mockRecipientCount,
        is_sent: !notificationData.scheduled_time,
        sent_time: !notificationData.scheduled_time ? new Date().toISOString() : undefined
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending business notification:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Business notification error:', error);
    return null;
  }
};

export const getBusinessAnalytics = async (businessId: string) => {
  try {
    // Get business notifications stats
    const { data: notifications, error: notificationsError } = await supabase
      .from('business_notifications')
      .select('*')
      .eq('business_id', businessId);

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
    }

    // Get location claims
    const { data: claims, error: claimsError } = await supabase
      .from('location_claims')
      .select('*, locations(*)')
      .eq('business_id', businessId);

    if (claimsError) {
      console.error('Error fetching location claims:', claimsError);
    }

    return {
      notifications: notifications || [],
      locationClaims: claims || []
    };
  } catch (error) {
    console.error('Business analytics error:', error);
    return {
      notifications: [],
      locationClaims: []
    };
  }
};
