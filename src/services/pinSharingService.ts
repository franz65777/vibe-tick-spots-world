import { supabase } from '@/integrations/supabase/client';
import { messageService } from './messageService';

export interface SharedPin {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  address?: string;
  description?: string;
  image?: string;
  google_place_id?: string;
  shared_by: string;
  shared_at: string;
}

export interface PinShareData {
  place_id?: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  address?: string;
  description?: string;
  image?: string;
  google_place_id?: string;
}

export class PinSharingService {
  /**
   * Share a pin with another user via direct message
   */
  static async sharePin(recipientUserId: string, pinData: PinShareData, message?: string): Promise<void> {
    try {
      await messageService.sendPlaceShare(recipientUserId, {
        ...pinData,
        shared_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sharing pin:', error);
      throw new Error('Failed to share pin');
    }
  }

  /**
   * Share multiple pins with a user
   */
  static async sharePinCollection(
    recipientUserId: string, 
    pins: PinShareData[], 
    collectionName: string,
    message?: string
  ): Promise<void> {
    try {
      const collectionData = {
        type: 'pin_collection',
        collection_name: collectionName,
        pins: pins,
        shared_at: new Date().toISOString()
      };

      await messageService.sendPlaceShare(
        recipientUserId,
        collectionData
      );
    } catch (error) {
      console.error('Error sharing pin collection:', error);
      throw new Error('Failed to share pin collection');
    }
  }

  /**
   * Create a shareable link for a pin
   */
  static async createShareableLink(pinData: PinShareData): Promise<string> {
    try {
      // Store the shareable pin data temporarily
      const { data, error } = await supabase
        .from('shared_places')
        .insert({
          place_name: pinData.name,
          place_id: pinData.place_id || `temp_${Date.now()}`,
          place_data: pinData as any,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          recipient_id: null // Public share
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Create shareable URL
      const baseUrl = window.location.origin;
      return `${baseUrl}/shared-pin/${data.id}`;
    } catch (error) {
      console.error('Error creating shareable link:', error);
      throw new Error('Failed to create shareable link');
    }
  }

  /**
   * Get shared pin by ID (for opening shared links)
   */
  static async getSharedPin(shareId: string): Promise<SharedPin | null> {
    try {
      const { data, error } = await supabase
        .from('shared_places')
        .select('*')
        .eq('id', shareId)
        .single();

      if (error || !data) return null;

      const placeData = data.place_data as any;
      
      return {
        id: data.id,
        name: data.place_name,
        category: placeData?.category || 'place',
        coordinates: placeData?.coordinates || { lat: 0, lng: 0 },
        address: placeData?.address,
        description: placeData?.description,
        image: placeData?.image,
        google_place_id: placeData?.google_place_id,
        shared_by: data.sender_id,
        shared_at: data.created_at
      };
    } catch (error) {
      console.error('Error fetching shared pin:', error);
      return null;
    }
  }

  /**
   * Save a shared pin to user's saved places
   */
  static async saveSharedPin(sharedPin: SharedPin): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // First, check if location exists or create it
      let locationId = sharedPin.google_place_id;
      
      if (!locationId) {
        const { data: location, error: locationError } = await supabase
          .from('locations')
          .insert({
            name: sharedPin.name,
            category: sharedPin.category,
            address: sharedPin.address,
            latitude: sharedPin.coordinates.lat,
            longitude: sharedPin.coordinates.lng,
            google_place_id: sharedPin.google_place_id,
            created_by: user.id
          })
          .select()
          .single();

        if (locationError) throw locationError;
        locationId = location.id;
      }

      // Save to user's saved places
      const { error } = await supabase
        .from('user_saved_locations')
        .insert({
          user_id: user.id,
          location_id: locationId
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving shared pin:', error);
      throw new Error('Failed to save shared pin');
    }
  }
}

export const pinSharingService = PinSharingService;