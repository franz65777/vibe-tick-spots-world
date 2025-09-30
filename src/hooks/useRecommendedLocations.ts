import { useState, useEffect } from 'react';
import { getRecommendedLocations } from '@/services/recommendationService';

interface RecommendedLocation {
  id: string;
  name: string;
  category: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  description: string | null;
  score: number;
  badge: 'offer' | 'popular' | 'recommended' | 'trending' | null;
  friends_saved: number;
  friend_avatars: string[];
  is_promoted?: boolean;
  discount_text?: string;
}

interface UseRecommendedLocationsProps {
  currentCity?: string;
  userId?: string;
  limit?: number;
}

export const useRecommendedLocations = ({ 
  currentCity, 
  userId, 
  limit = 10
}: UseRecommendedLocationsProps) => {
  const [locations, setLocations] = useState<RecommendedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!userId) {
        setLocations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use the new recommendation service
        const recommendations = await getRecommendedLocations(userId, currentCity, limit);
        setLocations(recommendations);

      } catch (err: any) {
        console.error('Error fetching recommendations:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentCity, userId, limit]);

  return { locations, loading, error };
};
