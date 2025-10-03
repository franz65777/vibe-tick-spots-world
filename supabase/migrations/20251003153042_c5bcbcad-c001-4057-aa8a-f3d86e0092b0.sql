-- Remove the weekly location metrics triggers and function with CASCADE
DROP FUNCTION IF EXISTS update_weekly_location_metrics() CASCADE;

-- Drop the location of the week function as it's no longer needed
DROP FUNCTION IF EXISTS get_location_of_the_week() CASCADE;

-- Drop the weekly location metrics table as it's no longer needed
DROP TABLE IF EXISTS weekly_location_metrics CASCADE;