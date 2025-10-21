import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 Starting full app with dependencies fixed...');

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

console.log('✅ Root element found');
const root = createRoot(rootElement);
console.log('✅ React root created');

root.render(<App />);
console.log('✅ Full App render called');
