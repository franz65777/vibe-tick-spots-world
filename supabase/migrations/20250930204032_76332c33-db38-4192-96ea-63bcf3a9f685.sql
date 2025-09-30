-- Fix security warnings: Add search_path to functions

-- Fix generate_confirmation_code function
CREATE OR REPLACE FUNCTION public.generate_confirmation_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Fix set_confirmation_code function
CREATE OR REPLACE FUNCTION public.set_confirmation_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.confirmation_code IS NULL THEN
    NEW.confirmation_code := public.generate_confirmation_code();
  END IF;
  RETURN NEW;
END;
$$;