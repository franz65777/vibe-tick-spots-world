-- Create comments table for posts
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX idx_post_comments_created_at ON public.post_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all post comments"
  ON public.post_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own comments"
  ON public.post_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.post_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.post_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_participants table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 2000),
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes for chats
CREATE INDEX idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable RLS for chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chats
CREATE POLICY "Users can view chats they participate in"
  ON public.chats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = chats.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats"
  ON public.chats
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update chats they created"
  ON public.chats
  FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants of their chats"
  ON public.chat_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Chat creators can add participants"
  ON public.chat_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = chat_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can leave chats"
  ON public.chat_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their chats"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = chat_messages.chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = chat_messages.chat_id AND user_id = auth.uid()
    )
  );

-- Function to get user's activity feed
CREATE OR REPLACE FUNCTION get_user_feed(target_user_id UUID, feed_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  event_type TEXT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  location_id UUID,
  location_name TEXT,
  post_id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH following_users AS (
    SELECT following_id FROM public.follows WHERE follower_id = target_user_id
  ),
  feed_items AS (
    -- Interactions from followed users
    SELECT 
      i.id,
      CONCAT(i.action_type, '_location') as event_type,
      i.user_id,
      p.username,
      p.avatar_url,
      i.location_id,
      l.name as location_name,
      NULL::UUID as post_id,
      NULL::TEXT as content,
      i.created_at
    FROM public.interactions i
    JOIN public.profiles p ON i.user_id = p.id
    LEFT JOIN public.locations l ON i.location_id = l.id
    WHERE i.user_id IN (SELECT following_id FROM following_users)
      AND i.created_at >= NOW() - INTERVAL '7 days'
    
    UNION ALL
    
    -- Posts from followed users
    SELECT 
      po.id,
      'new_post' as event_type,
      po.user_id,
      p.username,
      p.avatar_url,
      po.location_id,
      l.name as location_name,
      po.id as post_id,
      po.caption as content,
      po.created_at
    FROM public.posts po
    JOIN public.profiles p ON po.user_id = p.id
    LEFT JOIN public.locations l ON po.location_id = l.id
    WHERE po.user_id IN (SELECT following_id FROM following_users)
      AND po.created_at >= NOW() - INTERVAL '7 days'
  )
  SELECT * FROM feed_items
  ORDER BY created_at DESC
  LIMIT feed_limit;
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;