// Preload category images for faster rendering
import hotel from '@/assets/category-hotel-3d-new.png';
import cafe from '@/assets/category-cafe-3d-new.png';
import bar from '@/assets/category-bar-3d-new.png';
import restaurant from '@/assets/category-restaurant-3d-new.png';
import entertainment from '@/assets/category-entertainment-3d-new.png';
import bakery from '@/assets/category-bakery-3d-new.png';
import museum from '@/assets/category-museum-3d-new.png';

const categoryImages = [hotel, cafe, bar, restaurant, entertainment, bakery, museum];

export const preloadCategoryImages = () => {
  categoryImages.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
};
