// Test all APIs to ensure they're working
import { nominatimGeocoding } from './lib/nominatimGeocoding';
import { supabase } from './integrations/supabase/client';

export const testAllAPIs = async () => {
  console.log('🧪 Testing all APIs...');
  
  const results = {
    supabase: false,
    nominatim: false,
    reverseGeocode: false
  };
  
  // Test Supabase
  try {
    const { data, error } = await supabase.from('locations').select('count').limit(1);
    if (!error) {
      results.supabase = true;
      console.log('✅ Supabase: Working');
    } else {
      console.error('❌ Supabase error:', error);
    }
  } catch (err) {
    console.error('❌ Supabase error:', err);
  }
  
  // Test Nominatim search
  try {
    const searchResults = await nominatimGeocoding.searchPlace('Dublin');
    if (searchResults.length > 0) {
      results.nominatim = true;
      console.log('✅ Nominatim search: Working', searchResults.length, 'results');
    } else {
      console.warn('⚠️ Nominatim search: No results');
    }
  } catch (err) {
    console.error('❌ Nominatim search error:', err);
  }
  
  // Test reverse geocoding
  try {
    const reverseResult = await nominatimGeocoding.reverseGeocode(53.349805, -6.26031);
    if (reverseResult) {
      results.reverseGeocode = true;
      console.log('✅ Reverse geocoding: Working', reverseResult.city);
    } else {
      console.warn('⚠️ Reverse geocoding: No result');
    }
  } catch (err) {
    console.error('❌ Reverse geocoding error:', err);
  }
  
  return results;
};

// Auto-run tests
testAllAPIs();