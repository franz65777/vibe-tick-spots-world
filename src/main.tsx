import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App.tsx'
import MinimalApp from './components/MinimalApp.tsx'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './i18n'
import { useEffect } from 'react'
import { preloadCategoryImages } from './utils/preloadCategoryImages'

console.log('🚀 Starting full app with dependencies fixed...');

// Preload category images for faster rendering
preloadCategoryImages();

// Preload intro video asset BEFORE React mounts for instant playback
// This starts buffering the video while JS is still loading
const preloadVideoLink = document.createElement('link');
preloadVideoLink.rel = 'preload';
preloadVideoLink.as = 'video';
preloadVideoLink.type = 'video/mp4';
// Dynamic import path - Vite will replace this at build time
import introVideoPath from './assets/intro_finale.mp4';
preloadVideoLink.href = introVideoPath;
document.head.appendChild(preloadVideoLink);
console.log('📹 Video preload link injected');

// Dark mode system preference handler
const DarkModeHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      const isDark = e.matches;
      document.documentElement.classList.toggle('dark', isDark);
    };
    
    // Set initial theme
    updateTheme(mediaQuery);
    
    // Listen for changes
    mediaQuery.addEventListener('change', updateTheme);
    
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, []);
  
  return <>{children}</>;
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

console.log('✅ Root element found');
const root = createRoot(rootElement);
console.log('✅ React root created');

const safeBoot = location.search.includes('safe=1') || localStorage.getItem('SAFE_BOOT') === '1';
root.render(
  <QueryClientProvider client={queryClient}>
    <DarkModeHandler>
      {safeBoot ? <MinimalApp /> : <App />}
    </DarkModeHandler>
  </QueryClientProvider>
);
console.log('✅ Full App render called');
