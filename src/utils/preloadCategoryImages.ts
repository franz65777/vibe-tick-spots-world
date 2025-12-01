// Preload category images for faster rendering
import hotel from '@/assets/category-hotel-transparent.png';
import cafe from '@/assets/category-cafe-transparent.png';
import bar from '@/assets/category-bar-transparent.png';
import restaurant from '@/assets/category-restaurant-transparent.png';
import entertainment from '@/assets/category-entertainment-transparent.png';
import bakery from '@/assets/category-bakery-transparent.png';
import museum from '@/assets/category-museum-transparent.png';

const categoryImages = [hotel, cafe, bar, restaurant, entertainment, bakery, museum];

export const preloadCategoryImages = () => {
  categoryImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
};
