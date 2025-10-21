import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 Starting React app...');

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  console.log('✅ Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  console.log('✅ React root created, rendering App...');
  root.render(<App />);
  
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Error starting app:', error);
}
