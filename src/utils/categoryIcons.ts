
import { Utensils, Building, Coffee, ShoppingBag, MapPin, Music, Camera, Dumbbell, GraduationCap, Heart } from 'lucide-react';

export const getCategoryIcon = (category: string) => {
  const categoryLower = category.toLowerCase();
  
  switch (categoryLower) {
    case 'restaurant':
    case 'food':
    case 'dining':
      return Utensils;
    case 'hotel':
    case 'accommodation':
    case 'lodging':
      return Building;
    case 'cafe':
    case 'coffee':
    case 'coffee shop':
      return Coffee;
    case 'shopping':
    case 'shop':
    case 'store':
    case 'mall':
      return ShoppingBag;
    case 'bar':
    case 'nightlife':
    case 'club':
      return Music;
    case 'attraction':
    case 'landmark':
    case 'sightseeing':
      return Camera;
    case 'gym':
    case 'fitness':
    case 'sports':
      return Dumbbell;
    case 'museum':
    case 'gallery':
    case 'cultural':
      return GraduationCap;
    default:
      return Heart; // Default fallback
  }
};

export const getCategoryColor = (category: string) => {
  const categoryLower = category.toLowerCase();
  
  switch (categoryLower) {
    case 'restaurant':
    case 'food':
    case 'dining':
      return 'text-orange-500';
    case 'hotel':
    case 'accommodation':
    case 'lodging':
      return 'text-blue-500';
    case 'cafe':
    case 'coffee':
    case 'coffee shop':
      return 'text-amber-600';
    case 'shopping':
    case 'shop':
    case 'store':
    case 'mall':
      return 'text-purple-500';
    case 'bar':
    case 'nightlife':
    case 'club':
      return 'text-pink-500';
    case 'attraction':
    case 'landmark':
    case 'sightseeing':
      return 'text-green-500';
    case 'gym':
    case 'fitness':
    case 'sports':
      return 'text-red-500';
    case 'museum':
    case 'gallery':
    case 'cultural':
      return 'text-indigo-500';
    default:
      return 'text-red-500'; // Default fallback
  }
};
