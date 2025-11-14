-- Schedule cleanup of expired location shares every 5 minutes
-- This will automatically remove expired shares and update related notifications

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job to run every 5 minutes
SELECT cron.schedule(
  'cleanup-expired-location-shares',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://hrmklsvewmhpqixgyjmy.supabase.co/functions/v1/cleanup-location-shares',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)),
    body := '{}'::jsonb
  );
  $$
);
