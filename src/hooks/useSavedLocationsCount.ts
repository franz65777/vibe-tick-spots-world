
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';

export const useSavedLocationsCount = () => {
  const { user } = useAuth();
  const { getStats, loading } = useSavedPlaces();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!loading) {
      const stats = getStats();
      setCount(stats.places);
    }
  }, [loading]);

  const updateCount = (increment: boolean) => {
    setCount(prev => increment ? prev + 1 : Math.max(0, prev - 1));
  };

  return {
    count,
    loading,
    updateCount
  };
};
