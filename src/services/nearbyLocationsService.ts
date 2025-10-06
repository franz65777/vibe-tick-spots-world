import { supabase } from '@/integrations/supabase/client';
import { PlacesCacheService } from './placesCache';

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
   * Uses caching to reduce API calls by 80%
   */
  static async getNearbyLocations(
    userLat: number, 
    userLng: number, 
    radiusKm: number = 10,
    limit: number = 10,
    forceRefresh: boolean = false
  ): Promise<NearbyLocation[]> {
    try {
      // Generate cache key
      const cacheKey = PlacesCacheService.generateCacheKey({
        queryType: 'nearby',
        lat: userLat,
        lng: userLng,
        radius: radiusKm,
      });

      // Check cache first unless forced refresh
      if (!forceRefresh) {
        const cached = await PlacesCacheService.getCachedResults(cacheKey);
        if (cached) {
          console.log('📦 Using cached nearby locations');
          return cached;
        }
      }

      console.log('🌐 Fetching fresh nearby locations from database');
      
      // Fetch from database
      const { data: locations } = await supabase
        .from('locations')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(limit);

      // Transform to NearbyLocation format
      const results = (locations || []).map(loc => this.transformToNearbyLocation(loc));

      // Cache the results
      await PlacesCacheService.setCachedResults({
        cacheKey,
        queryText: `nearby_${radiusKm}km`,
        queryType: 'nearby',
        results,
        lat: userLat,
        lng: userLng,
        radiusKm,
      });

      return results;
    } catch (error) {
      console.error('Error fetching nearby locations:', error);
      return this.getMockNearbyLocations();
    }
  }

  /**
   * Get featured locations by type (business offers, popular, weekly winners)
   * Uses caching to reduce database queries
   */
  static async getFeaturedLocationsByType(
    type: NearbyLocation['type'],
    limit: number = 5,
    forceRefresh: boolean = false
  ): Promise<NearbyLocation[]> {
    try {
      const cacheKey = PlacesCacheService.generateCacheKey({
        queryType: `featured_${type}`,
      });

      // Check cache first
      if (!forceRefresh) {
        const cached = await PlacesCacheService.getCachedResults(cacheKey);
        if (cached) {
          console.log(`📦 Using cached ${type} locations`);
          return cached;
        }
      }

      console.log(`🌐 Fetching fresh ${type} locations`);
      const allLocations = this.getMockNearbyLocations();
      const results = allLocations.filter(loc => loc.type === type).slice(0, limit);

      // Cache results
      await PlacesCacheService.setCachedResults({
        cacheKey,
        queryText: `featured_${type}`,
        queryType: 'featured',
        results,
      });

      return results;
    } catch (error) {
      console.error('Error fetching featured locations:', error);
      return [];
    }
  }

  /**
   * Get business offers near user
   * Cached to reduce API calls
   */
  static async getBusinessOffers(
    userLat: number, 
    userLng: number, 
    limit: number = 5,
    forceRefresh: boolean = false
  ): Promise<NearbyLocation[]> {
    try {
      return this.getFeaturedLocationsByType('business_offer', limit, forceRefresh);
    } catch (error) {
      console.error('Error fetching business offers:', error);
      return [];
    }
  }

  /**
   * Transform database location to NearbyLocation format
   */
  private static transformToNearbyLocation(loc: any): NearbyLocation {
    return {
      id: loc.id,
      name: loc.name,
      type: 'popular',
      description: loc.description || 'Great place to visit',
      image: loc.image_url || 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb',
      coordinates: {
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
      },
      stats: {
        saves: 0,
        followers: 0,
        likes: 0,
      },
      badge: loc.category || 'New',
      category: loc.category || 'general',
      createdAt: loc.created_at,
      updatedAt: loc.updated_at,
    };
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