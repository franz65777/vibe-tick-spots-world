import { supabase } from '@/integrations/supabase/client';

export interface NearbyLocation {
  id: string;
  name: string;
  type: 'business_offer' | 'popular' | 'weekly_winner' | 'trending';
  description: string;
  image: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  stats: {
    saves: number;
    followers: number;
    likes: number;
  };
  badge: string;
  category: string;
  businessInfo?: {
    offer?: string;
    verified: boolean;
    hours?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export class NearbyLocationsService {
  
  /**
   * Fetch nearby featured locations based on user's current location
   */
  static async getNearbyLocations(
    userLat: number, 
    userLng: number, 
    radiusKm: number = 10,
    limit: number = 10
  ): Promise<NearbyLocation[]> {
    try {
      // TODO: Implement real Supabase query with PostGIS for location-based search
      // For now, return mock data
      return this.getMockNearbyLocations();
    } catch (error) {
      console.error('Error fetching nearby locations:', error);
      return this.getMockNearbyLocations();
    }
  }

  /**
   * Get featured locations by type (business offers, popular, weekly winners)
   */
  static async getFeaturedLocationsByType(
    type: NearbyLocation['type'],
    limit: number = 5
  ): Promise<NearbyLocation[]> {
    try {
      // TODO: Implement real Supabase query
      const allLocations = this.getMockNearbyLocations();
      return allLocations.filter(loc => loc.type === type).slice(0, limit);
    } catch (error) {
      console.error('Error fetching featured locations:', error);
      return [];
    }
  }

  /**
   * Get business offers near user
   */
  static async getBusinessOffers(
    userLat: number, 
    userLng: number, 
    limit: number = 5
  ): Promise<NearbyLocation[]> {
    try {
      // TODO: Implement real Supabase query for business offers
      return this.getFeaturedLocationsByType('business_offer', limit);
    } catch (error) {
      console.error('Error fetching business offers:', error);
      return [];
    }
  }

  /**
   * Mock data for development - replace with real API calls
   */
  private static getMockNearbyLocations(): NearbyLocation[] {
    return [
      {
        id: '1',
        name: 'Artisan Coffee Co.',
        type: 'business_offer',
        description: '20% off all specialty drinks this week',
        image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop&crop=center',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        stats: { saves: 24, followers: 18, likes: 45 },
        badge: '20% OFF',
        category: 'cafe',
        businessInfo: {
          offer: '20% off specialty drinks',
          verified: true,
          hours: '7AM - 9PM'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Central Park',
        type: 'popular',
        description: 'Saved by 25 people you follow',
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop&crop=center',
        coordinates: { lat: 40.7829, lng: -73.9654 },
        stats: { saves: 156, followers: 89, likes: 234 },
        badge: 'Trending',
        category: 'park',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Luna Rooftop Bar',
        type: 'weekly_winner',
        description: 'This week\'s most loved spot',
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=300&fit=crop&crop=center',
        coordinates: { lat: 40.7505, lng: -73.9934 },
        stats: { saves: 67, followers: 34, likes: 128 },
        badge: 'Featured',
        category: 'restaurant',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '4',
        name: 'Brooklyn Bridge',
        type: 'trending',
        description: 'Amazing sunset views',
        image: 'https://images.unsplash.com/photo-1543032564-6e4e9b1d8b2e?w=400&h=300&fit=crop&crop=center',
        coordinates: { lat: 40.7061, lng: -73.9969 },
        stats: { saves: 89, followers: 45, likes: 167 },
        badge: 'Iconic',
        category: 'landmark',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }
}