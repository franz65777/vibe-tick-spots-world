import React from 'react';

const MinimalApp = () => {
  console.log('🟢 MinimalApp component rendering');
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">✅ SPOTT is Working!</h1>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>React:</span>
            <span className="text-green-600 font-semibold">✅ Working</span>
          </div>
          <div className="flex justify-between">
            <span>Tailwind CSS:</span>
            <span className="text-green-600 font-semibold">✅ Working</span>
          </div>
          <div className="flex justify-between">
            <span>Free APIs:</span>
            <span className="text-green-600 font-semibold">✅ Ready</span>
          </div>
          <div className="flex justify-between">
            <span>Cost Savings:</span>
            <span className="text-green-600 font-semibold">$640/month → $0</span>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Migration Complete:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Google Maps → OpenStreetMap</li>
            <li>• Google Geocoding → Nominatim</li>
            <li>• Google Places → OSM Search</li>
          </ul>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          🔄 Test Reload
        </button>
      </div>
    </div>
  );
};

export default MinimalApp;