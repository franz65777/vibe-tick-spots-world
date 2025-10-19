-- Remove start_date and end_date columns from trips table
ALTER TABLE public.trips 
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date;