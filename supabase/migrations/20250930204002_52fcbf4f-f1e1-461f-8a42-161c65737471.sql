-- Create reservations table
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  party_size integer NOT NULL CHECK (party_size >= 1 AND party_size <= 20),
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'completed'
  special_requests text,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  confirmation_code text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT valid_reservation_date CHECK (reservation_date >= CURRENT_DATE)
);

-- Create table for tracking available time slots (can be populated from external API)
CREATE TABLE public.restaurant_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  time_slot time NOT NULL,
  max_party_size integer NOT NULL DEFAULT 8,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(location_id, day_of_week, time_slot)
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservations
CREATE POLICY "Users can view their own reservations"
ON public.reservations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reservations"
ON public.reservations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations"
ON public.reservations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservations"
ON public.reservations FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for restaurant_availability
CREATE POLICY "Everyone can view restaurant availability"
ON public.restaurant_availability FOR SELECT
USING (true);

CREATE POLICY "Business owners can manage availability"
ON public.restaurant_availability FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.locations l
    JOIN public.business_profiles bp ON l.claimed_by = bp.user_id
    WHERE l.id = restaurant_availability.location_id
      AND bp.user_id = auth.uid()
  )
);

-- Function to generate confirmation code
CREATE OR REPLACE FUNCTION public.generate_confirmation_code()
RETURNS text
LANGUAGE plpgsql
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

-- Trigger to generate confirmation code
CREATE OR REPLACE FUNCTION public.set_confirmation_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.confirmation_code IS NULL THEN
    NEW.confirmation_code := public.generate_confirmation_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_reservation_confirmation_code
BEFORE INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.set_confirmation_code();

-- Function to send reservation notification
CREATE OR REPLACE FUNCTION public.notify_reservation_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  location_name text;
BEGIN
  -- Get location name
  SELECT name INTO location_name FROM public.locations WHERE id = NEW.location_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'reservation_confirmed',
    'Reservation Confirmed',
    'Your table at ' || location_name || ' is booked for ' || 
    TO_CHAR(NEW.reservation_date, 'Mon DD') || ' at ' || 
    TO_CHAR(NEW.reservation_time, 'HH:MI AM'),
    jsonb_build_object(
      'reservation_id', NEW.id,
      'location_id', NEW.location_id,
      'confirmation_code', NEW.confirmation_code
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_reservation_created
AFTER INSERT ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.notify_reservation_created();

-- Insert sample availability for demo purposes (lunch and dinner slots)
INSERT INTO public.restaurant_availability (location_id, day_of_week, time_slot, max_party_size)
SELECT 
  l.id,
  dow,
  time_slot,
  8
FROM public.locations l
CROSS JOIN generate_series(0, 6) AS dow
CROSS JOIN (
  VALUES 
    ('12:00:00'::time), ('12:30:00'::time), ('13:00:00'::time), ('13:30:00'::time),
    ('18:00:00'::time), ('18:30:00'::time), ('19:00:00'::time), ('19:30:00'::time),
    ('20:00:00'::time), ('20:30:00'::time)
) AS slots(time_slot)
WHERE l.category ILIKE '%restaurant%' OR l.category ILIKE '%café%' OR l.category ILIKE '%bar%'
ON CONFLICT (location_id, day_of_week, time_slot) DO NOTHING;

-- Create indexes
CREATE INDEX idx_reservations_user ON public.reservations(user_id);
CREATE INDEX idx_reservations_location ON public.reservations(location_id);
CREATE INDEX idx_reservations_date ON public.reservations(reservation_date);
CREATE INDEX idx_reservations_status ON public.reservations(status);
CREATE INDEX idx_restaurant_availability_location ON public.restaurant_availability(location_id);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;