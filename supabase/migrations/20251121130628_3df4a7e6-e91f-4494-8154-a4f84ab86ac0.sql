-- Add collaborative trip features
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'private' CHECK (privacy IN ('public', 'private'));
ALTER TABLE trips ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create trip participants table
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- Create trip messages table (chat)
CREATE TABLE IF NOT EXISTS trip_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'location', 'system')),
  location_id UUID REFERENCES locations(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create trip location likes table
CREATE TABLE IF NOT EXISTS trip_location_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_location_id UUID NOT NULL REFERENCES trip_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trip_location_id, user_id)
);

-- Add likes_count to trip_locations
ALTER TABLE trip_locations ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- RLS Policies for trip_participants
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view trip participants if they are participants"
  ON trip_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp
      WHERE tp.trip_id = trip_participants.trip_id
      AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can add participants"
  ON trip_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_participants tp
      WHERE tp.trip_id = trip_participants.trip_id
      AND tp.user_id = auth.uid()
      AND tp.role = 'owner'
    )
  );

CREATE POLICY "Users can remove themselves from trips"
  ON trip_participants FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for trip_messages
ALTER TABLE trip_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their trips"
  ON trip_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp
      WHERE tp.trip_id = trip_messages.trip_id
      AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip participants can send messages"
  ON trip_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM trip_participants tp
      WHERE tp.trip_id = trip_messages.trip_id
      AND tp.user_id = auth.uid()
    )
  );

-- RLS Policies for trip_location_likes
ALTER TABLE trip_location_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes in their trips"
  ON trip_location_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_locations tl
      JOIN trip_participants tp ON tp.trip_id = tl.trip_id
      WHERE tl.id = trip_location_likes.trip_location_id
      AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip participants can like locations"
  ON trip_location_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM trip_locations tl
      JOIN trip_participants tp ON tp.trip_id = tl.trip_id
      WHERE tl.id = trip_location_likes.trip_location_id
      AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unlike locations"
  ON trip_location_likes FOR DELETE
  USING (user_id = auth.uid());

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_trip_location_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE trip_locations SET likes_count = likes_count + 1 WHERE id = NEW.trip_location_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE trip_locations SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.trip_location_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_location_likes_count_trigger
AFTER INSERT OR DELETE ON trip_location_likes
FOR EACH ROW EXECUTE FUNCTION update_trip_location_likes_count();