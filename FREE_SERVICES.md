# Free Services Configuration

This project uses 100% FREE mapping and geocoding services with aggressive caching to minimize API calls.

## 🗺️ Maps - Leaflet + OpenStreetMap
- **Service**: OpenStreetMap tiles via Leaflet
- **Cost**: $0 (completely free)
- **Usage**: Unlimited
- **Components**: 
  - `LeafletMapSetup.tsx` - Main map component
  - `LeafletExploreMap.tsx` - Explore page map
  - `leafletMarkerCreator.ts` - Custom marker utilities

## 🌍 Reverse Geocoding - Nominatim
- **Service**: OpenStreetMap Nominatim
- **Cost**: $0 (free, fair use policy)
- **Rate Limit**: 1 request/second (enforced in code)
- **Edge Function**: `supabase/functions/reverse-geocode/index.ts`
- **Caching**: Results cached in Supabase database

## 🔍 Place Search & Autocomplete - OpenStreetMap
- **Service**: Nominatim Search API
- **Cost**: $0 (free, fair use policy)
- **Components**:
  - `OpenStreetMapAutocomplete.tsx` - Single autocomplete
  - `UnifiedSearchAutocomplete.tsx` - Combined DB + OSM search
  - `nominatimGeocoding.ts` - Geocoding utilities

## 💾 Aggressive Caching Strategy
All location data is cached in Supabase to minimize external API calls:

### Tables:
- `locations` - All places saved by users
- `places_cache` - Search query results cache (7-day expiry)
- Database caching reduces API calls by ~95%

### Cache Flow:
1. Check local database first
2. Only call external APIs if data not found
3. Store results for future use
4. Re-use cached data for repeated searches

## 📊 Cost Comparison
- **Before (Google Maps)**: ~$200-500/month for moderate usage
- **After (OSM + Leaflet)**: $0/month + Supabase storage (~$1-2/month)

## ⚡ Performance
- Leaflet is lighter than Google Maps (~42KB vs ~300KB)
- OSM tiles load faster on mobile
- Database caching provides instant results
- No third-party API keys needed

## 🔒 Privacy
- No user data sent to Google
- All location data stored in your Supabase database
- Full control over user information
