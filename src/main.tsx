import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import App from './App.tsx'
import MinimalApp from './components/MinimalApp.tsx'
import 'leaflet/dist/leaflet.css'
import './index.css'
import './i18n'

console.log('🚀 Starting full app with dependencies fixed...');

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
    {safeBoot ? <MinimalApp /> : <App />}
  </QueryClientProvider>
);
console.log('✅ Full App render called');
