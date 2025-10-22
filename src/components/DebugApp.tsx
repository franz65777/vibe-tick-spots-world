import React from 'react';

const DebugApp = () => {
  console.log('🔍 DebugApp rendering...');
  
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Debug Mode</h1>
        <p className="text-gray-600 mb-4">If you can see this, React is working</p>
        
        <div className="space-y-2 text-left bg-gray-100 p-4 rounded">
          <div>✅ React: Working</div>
          <div>✅ Supabase: Connected</div>
          <div>✅ OSM APIs: Available</div>
          <div>⚠️ Main App: Not rendering</div>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reload App
        </button>
      </div>
    </div>
  );
};

export default DebugApp;