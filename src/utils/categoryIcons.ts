import { Utensils, Building, Coffee, ShoppingBag, MapPin, Music, Camera, Dumbbell, GraduationCap, Heart, Trees, Landmark, Disc } from 'lucide-react';

// Category image assets (3D variants for vibrant categories)
import imgRestaurant from '@/assets/category-restaurant-3d-new.png';
import imgBar from '@/assets/category-bar-3d-new.png';
import imgCafe from '@/assets/category-cafe-3d-new.png';
import imgHotel from '@/assets/category-hotel-3d-new.png';
import imgEntertainment from '@/assets/category-entertainment-3d-new.png';
import imgMuseum from '@/assets/category-museum-3d-new.png';
import imgBakery from '@/assets/category-bakery-3d-new.png';
import imgPark from '@/assets/category-park-3d-new.png';
import imgHistorical from '@/assets/category-historical-3d-new.png';
import imgNightclub from '@/assets/category-nightclub-3d-new.png';

export const getCategoryIcon = (category: string) => {
  const categoryLower = category?.toLowerCase?.() || '';
  
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
    case 'café':
    case 'coffee':
    case 'coffee shop':
      return Coffee;
    case 'shopping':
    case 'shop':
    case 'store':
    case 'mall':
      return ShoppingBag;
    case 'bar':
    case 'bar & pub':
      return Music;
    case 'nightclub':
    case 'club':
    case 'nightlife':
      return Disc;
    case 'park':
    case 'garden':
    case 'playground':
      return Trees;
    case 'historical':
    case 'landmark':
    case 'monument':
    case 'attraction':
    case 'sightseeing':
      return Landmark;
    case 'gym':
    case 'fitness':
    case 'sports':
      return Dumbbell;
    case 'museum':
    case 'gallery':
    case 'cultural':
      return GraduationCap;
    case 'entertainment':
      return Camera;
    default:
      return Heart; // Default fallback
  }
};

export const getCategoryColor = (category: string) => {
  const categoryLower = category?.toLowerCase?.() || '';
  
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
    case 'café':
    case 'coffee':
    case 'coffee shop':
      return 'text-amber-600';
    case 'bakery':
      return 'text-yellow-600';
    case 'shopping':
    case 'shop':
    case 'store':
    case 'mall':
      return 'text-purple-500';
    case 'bar':
    case 'bar & pub':
      return 'text-pink-500';
    case 'nightclub':
    case 'club':
    case 'nightlife':
      return 'text-violet-500';
    case 'park':
    case 'garden':
    case 'playground':
      return 'text-green-500';
    case 'historical':
    case 'landmark':
    case 'monument':
    case 'attraction':
    case 'sightseeing':
      return 'text-amber-700';
    case 'gym':
    case 'fitness':
    case 'sports':
      return 'text-red-500';
    case 'museum':
    case 'gallery':
    case 'cultural':
      return 'text-indigo-500';
    case 'entertainment':
      return 'text-purple-600';
    default:
      return 'text-red-500'; // Default fallback
  }
};

// Normalize various labels to our 10 base categories
function normalizeBaseCategory(category: string) {
  const c = (category || '').toLowerCase();
  if (['restaurant', 'food', 'dining'].includes(c)) return 'restaurant';
  if (['cafe', 'café', 'coffee', 'coffee shop'].includes(c)) return 'cafe';
  if (['bar', 'bar & pub', 'pub'].includes(c)) return 'bar';
  if (['nightclub', 'club', 'nightlife', 'disco'].includes(c)) return 'nightclub';
  if (['hotel', 'accommodation', 'lodging'].includes(c)) return 'hotel';
  if (['museum', 'gallery', 'cultural'].includes(c)) return 'museum';
  if (['entertainment', 'cinema', 'theatre', 'theater'].includes(c)) return 'entertainment';
  if (['bakery', 'patisserie', 'pastry'].includes(c)) return 'bakery';
  if (['park', 'garden', 'playground', 'nature'].includes(c)) return 'park';
  if (['historical', 'landmark', 'monument', 'attraction', 'sightseeing'].includes(c)) return 'historical';
  return 'restaurant';
}

// Return image asset path for category icons
export const getCategoryImage = (category: string): string => {
  const base = normalizeBaseCategory(category);
  switch (base) {
    case 'restaurant':
      return imgRestaurant;
    case 'bar':
      return imgBar;
    case 'cafe':
      return imgCafe;
    case 'hotel':
      return imgHotel;
    case 'entertainment':
      return imgEntertainment;
    case 'museum':
      return imgMuseum;
    case 'bakery':
      return imgBakery;
    case 'park':
      return imgPark;
    case 'historical':
      return imgHistorical;
    case 'nightclub':
      return imgNightclub;
    default:
      return imgRestaurant;
  }
};
