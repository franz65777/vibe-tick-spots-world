// Preload Add page assets for faster rendering using proper ES6 imports
import addHeroCards from '@/assets/add-hero-cards.png';
import cameraIcon from '@/assets/camera-icon.png';
import listIcon from '@/assets/list-icon.png';
import addPostButton from '@/assets/add-post-button.png';

const addPageAssets = [addHeroCards, cameraIcon, listIcon, addPostButton];

export const preloadAddPageAssets = () => {
  addPageAssets.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
};
