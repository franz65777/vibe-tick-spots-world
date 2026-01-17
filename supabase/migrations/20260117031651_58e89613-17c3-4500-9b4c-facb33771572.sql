-- Create a function to get accurate location enrichment stats
CREATE OR REPLACE FUNCTION get_location_enrichment_stats()
RETURNS JSON AS $$
SELECT json_build_object(
  'total_locations', COUNT(*),
  'with_photos', COUNT(*) FILTER (WHERE photos IS NOT NULL AND jsonb_array_length(photos::jsonb) > 0),
  'with_hours', COUNT(*) FILTER (WHERE opening_hours_data IS NOT NULL),
  'with_google_id', COUNT(*) FILTER (WHERE google_place_id LIKE 'ChIJ%'),
  'needs_enrichment', COUNT(*) FILTER (WHERE 
    (photos IS NULL OR jsonb_array_length(photos::jsonb) = 0) 
    OR opening_hours_data IS NULL
  )
) FROM locations;
$$ LANGUAGE SQL STABLE;