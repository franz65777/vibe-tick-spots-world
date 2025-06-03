
import { supabase } from '@/integrations/supabase/client';

export interface SearchPlace {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  coordinates: { lat: number; lng: number };
  description?: string;
  image?: string;
  averageRating?: number;
  totalReviews?: number;
}

export interface SearchUser {
  id: string;
  username: string;
  fullName: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  isVerified?: boolean;
}

// Mock data for places (in a real app, this would come from a places API like Google Places)
const mockPlaces: SearchPlace[] = [
  {
    id: 'place-1',
    name: 'Golden Gate Bridge',
    category: 'landmark',
    city: 'San Francisco',
    country: 'USA',
    coordinates: { lat: 37.8199, lng: -122.4783 },
    description: 'Iconic suspension bridge',
    averageRating: 4.7,
    totalReviews: 15420
  },
  {
    id: 'place-2',
    name: 'Alcatraz Island',
    category: 'museum',
    city: 'San Francisco',
    country: 'USA',
    coordinates: { lat: 37.8267, lng: -122.4233 },
    description: 'Historic federal prison',
    averageRating: 4.5,
    totalReviews: 8230
  },
  {
    id: 'place-3',
    name: 'Fisherman\'s Wharf',
    category: 'attraction',
    city: 'San Francisco',
    country: 'USA',
    coordinates: { lat: 37.8080, lng: -122.4177 },
    description: 'Popular waterfront destination',
    averageRating: 4.2,
    totalReviews: 12100
  },
  {
    id: 'place-4',
    name: 'Blue Bottle Coffee',
    category: 'cafe',
    city: 'San Francisco',
    country: 'USA',
    coordinates: { lat: 37.7849, lng: -122.4094 },
    description: 'Specialty coffee roaster',
    averageRating: 4.4,
    totalReviews: 2340
  },
  {
    id: 'place-5',
    name: 'State Bird Provisions',
    category: 'restaurant',
    city: 'San Francisco',
    country: 'USA',
    coordinates: { lat: 37.7849, lng: -122.4194 },
    description: 'Michelin-starred restaurant',
    averageRating: 4.6,
    totalReviews: 890
  },
  {
    id: 'place-6',
    name: 'The Fillmore',
    category: 'bar',
    city: 'San Francisco',
    country: 'USA',
    coordinates: { lat: 37.7849, lng: -122.4394 },
    description: 'Historic music venue',
    averageRating: 4.3,
    totalReviews: 1560
  }
];

export const searchPlaces = async (query: string, category?: string): Promise<SearchPlace[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const queryLower = query.toLowerCase();
  
  let results = mockPlaces.filter(place => 
    place.name.toLowerCase().includes(queryLower) ||
    place.description?.toLowerCase().includes(queryLower) ||
    place.category.toLowerCase().includes(queryLower)
  );
  
  if (category && category !== 'all') {
    results = results.filter(place => place.category === category);
  }
  
  return results;
};

export const searchUsers = async (query: string): Promise<SearchUser[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .or(`username.ilike.%${query}%, full_name.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      // Return mock data as fallback
      return getMockUsers(query);
    }

    return data?.map(profile => ({
      id: profile.id,
      username: profile.username || 'user',
      fullName: profile.full_name || 'User',
      avatar: profile.avatar_url || undefined,
      bio: profile.bio || undefined,
      followersCount: Math.floor(Math.random() * 1000), // Mock followers count
      isVerified: Math.random() > 0.8 // 20% chance of being verified
    })) || [];
  } catch (error) {
    console.error('Search users error:', error);
    return getMockUsers(query);
  }
};

const getMockUsers = (query: string): SearchUser[] => {
  const mockUsers: SearchUser[] = [
    {
      id: 'user-1',
      username: 'foodie_explorer',
      fullName: 'Alex Thompson',
      avatar: '/lovable-uploads/8a9fd2cf-e687-48ee-a40f-3dd4b19ba4ff.png',
      bio: 'Food lover exploring SF',
      followersCount: 1250,
      isVerified: true
    },
    {
      id: 'user-2',
      username: 'sf_wanderer',
      fullName: 'Emma Rodriguez',
      avatar: '/lovable-uploads/2fcc6da9-f1e0-4521-944b-853d770dcea9.png',
      bio: 'Local SF guide',
      followersCount: 890,
      isVerified: false
    },
    {
      id: 'user-3',
      username: 'coffee_addict',
      fullName: 'Michael Chen',
      avatar: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png',
      bio: 'Coffee shop hunter',
      followersCount: 567,
      isVerified: false
    }
  ];

  const queryLower = query.toLowerCase();
  return mockUsers.filter(user =>
    user.username.toLowerCase().includes(queryLower) ||
    user.fullName.toLowerCase().includes(queryLower)
  );
};

export const getNearbyPlaces = async (lat: number, lng: number, radius: number = 5): Promise<SearchPlace[]> => {
  // In a real app, this would use the user's location and a places API
  // For now, return all mock places as "nearby"
  return mockPlaces;
};
