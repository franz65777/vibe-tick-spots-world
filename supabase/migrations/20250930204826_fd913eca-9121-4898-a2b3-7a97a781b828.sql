-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Now create app_events table
CREATE TABLE IF NOT EXISTS public.app_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  city TEXT,
  category TEXT,
  feature TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own events"
  ON public.app_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
  ON public.app_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admin users can view all events (using the secure function)
CREATE POLICY "Admins can view all events"
  ON public.app_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_app_events_user_id ON public.app_events(user_id);
CREATE INDEX idx_app_events_event_type ON public.app_events(event_type);
CREATE INDEX idx_app_events_created_at ON public.app_events(created_at);
CREATE INDEX idx_app_events_city ON public.app_events(city);
CREATE INDEX idx_app_events_category ON public.app_events(category);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Retention calculation functions
CREATE OR REPLACE FUNCTION public.calculate_day1_retention(start_date DATE, end_date DATE)
RETURNS TABLE(
  cohort_date DATE,
  total_users BIGINT,
  retained_users BIGINT,
  retention_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH first_sessions AS (
    SELECT 
      user_id,
      DATE(MIN(created_at)) as first_session_date
    FROM public.app_events
    WHERE event_type = 'session_start'
      AND DATE(created_at) BETWEEN start_date AND end_date
    GROUP BY user_id
  ),
  day1_sessions AS (
    SELECT DISTINCT
      fs.user_id,
      fs.first_session_date
    FROM first_sessions fs
    INNER JOIN public.app_events ae ON fs.user_id = ae.user_id
    WHERE ae.event_type = 'session_start'
      AND DATE(ae.created_at) = fs.first_session_date + INTERVAL '1 day'
  )
  SELECT 
    fs.first_session_date as cohort_date,
    COUNT(DISTINCT fs.user_id) as total_users,
    COUNT(DISTINCT d1.user_id) as retained_users,
    ROUND(
      CASE 
        WHEN COUNT(DISTINCT fs.user_id) > 0 
        THEN (COUNT(DISTINCT d1.user_id)::NUMERIC / COUNT(DISTINCT fs.user_id)::NUMERIC) * 100
        ELSE 0
      END, 2
    ) as retention_rate
  FROM first_sessions fs
  LEFT JOIN day1_sessions d1 ON fs.user_id = d1.user_id
  GROUP BY fs.first_session_date
  ORDER BY fs.first_session_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_day7_retention(start_date DATE, end_date DATE)
RETURNS TABLE(
  cohort_date DATE,
  total_users BIGINT,
  retained_users BIGINT,
  retention_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH first_sessions AS (
    SELECT 
      user_id,
      DATE(MIN(created_at)) as first_session_date
    FROM public.app_events
    WHERE event_type = 'session_start'
      AND DATE(created_at) BETWEEN start_date AND end_date
    GROUP BY user_id
  ),
  day7_sessions AS (
    SELECT DISTINCT
      fs.user_id,
      fs.first_session_date
    FROM first_sessions fs
    INNER JOIN public.app_events ae ON fs.user_id = ae.user_id
    WHERE ae.event_type = 'session_start'
      AND DATE(ae.created_at) BETWEEN fs.first_session_date + INTERVAL '6 days' 
      AND fs.first_session_date + INTERVAL '8 days'
  )
  SELECT 
    fs.first_session_date as cohort_date,
    COUNT(DISTINCT fs.user_id) as total_users,
    COUNT(DISTINCT d7.user_id) as retained_users,
    ROUND(
      CASE 
        WHEN COUNT(DISTINCT fs.user_id) > 0 
        THEN (COUNT(DISTINCT d7.user_id)::NUMERIC / COUNT(DISTINCT fs.user_id)::NUMERIC) * 100
        ELSE 0
      END, 2
    ) as retention_rate
  FROM first_sessions fs
  LEFT JOIN day7_sessions d7 ON fs.user_id = d7.user_id
  GROUP BY fs.first_session_date
  ORDER BY fs.first_session_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_day30_retention(start_date DATE, end_date DATE)
RETURNS TABLE(
  cohort_date DATE,
  total_users BIGINT,
  retained_users BIGINT,
  retention_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH first_sessions AS (
    SELECT 
      user_id,
      DATE(MIN(created_at)) as first_session_date
    FROM public.app_events
    WHERE event_type = 'session_start'
      AND DATE(created_at) BETWEEN start_date AND end_date
    GROUP BY user_id
  ),
  day30_sessions AS (
    SELECT DISTINCT
      fs.user_id,
      fs.first_session_date
    FROM first_sessions fs
    INNER JOIN public.app_events ae ON fs.user_id = ae.user_id
    WHERE ae.event_type = 'session_start'
      AND DATE(ae.created_at) BETWEEN fs.first_session_date + INTERVAL '28 days' 
      AND fs.first_session_date + INTERVAL '32 days'
  )
  SELECT 
    fs.first_session_date as cohort_date,
    COUNT(DISTINCT fs.user_id) as total_users,
    COUNT(DISTINCT d30.user_id) as retained_users,
    ROUND(
      CASE 
        WHEN COUNT(DISTINCT fs.user_id) > 0 
        THEN (COUNT(DISTINCT d30.user_id)::NUMERIC / COUNT(DISTINCT fs.user_id)::NUMERIC) * 100
        ELSE 0
      END, 2
    ) as retention_rate
  FROM first_sessions fs
  LEFT JOIN day30_sessions d30 ON fs.user_id = d30.user_id
  GROUP BY fs.first_session_date
  ORDER BY fs.first_session_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dau(target_date DATE)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM public.app_events
  WHERE DATE(created_at) = target_date
    AND event_type = 'session_start';
$$;

CREATE OR REPLACE FUNCTION public.get_mau(target_month DATE)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM public.app_events
  WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', target_month)
    AND event_type = 'session_start';
$$;

CREATE OR REPLACE FUNCTION public.get_feature_usage(start_date DATE, end_date DATE)
RETURNS TABLE(
  feature TEXT,
  usage_count BIGINT,
  unique_users BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    feature,
    COUNT(*) as usage_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM public.app_events
  WHERE feature IS NOT NULL
    AND DATE(created_at) BETWEEN start_date AND end_date
  GROUP BY feature
  ORDER BY usage_count DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_retention_by_city(start_date DATE, end_date DATE)
RETURNS TABLE(
  city TEXT,
  total_users BIGINT,
  day1_retained BIGINT,
  day7_retained BIGINT,
  day1_rate NUMERIC,
  day7_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH first_sessions AS (
    SELECT 
      user_id,
      city,
      DATE(MIN(created_at)) as first_session_date
    FROM public.app_events
    WHERE event_type = 'session_start'
      AND city IS NOT NULL
      AND DATE(created_at) BETWEEN start_date AND end_date
    GROUP BY user_id, city
  ),
  day1_retained AS (
    SELECT DISTINCT fs.user_id, fs.city
    FROM first_sessions fs
    INNER JOIN public.app_events ae ON fs.user_id = ae.user_id
    WHERE ae.event_type = 'session_start'
      AND DATE(ae.created_at) = fs.first_session_date + INTERVAL '1 day'
  ),
  day7_retained AS (
    SELECT DISTINCT fs.user_id, fs.city
    FROM first_sessions fs
    INNER JOIN public.app_events ae ON fs.user_id = ae.user_id
    WHERE ae.event_type = 'session_start'
      AND DATE(ae.created_at) BETWEEN fs.first_session_date + INTERVAL '6 days'
      AND fs.first_session_date + INTERVAL '8 days'
  )
  SELECT 
    fs.city,
    COUNT(DISTINCT fs.user_id) as total_users,
    COUNT(DISTINCT d1.user_id) as day1_retained,
    COUNT(DISTINCT d7.user_id) as day7_retained,
    ROUND(
      CASE 
        WHEN COUNT(DISTINCT fs.user_id) > 0 
        THEN (COUNT(DISTINCT d1.user_id)::NUMERIC / COUNT(DISTINCT fs.user_id)::NUMERIC) * 100
        ELSE 0
      END, 2
    ) as day1_rate,
    ROUND(
      CASE 
        WHEN COUNT(DISTINCT fs.user_id) > 0 
        THEN (COUNT(DISTINCT d7.user_id)::NUMERIC / COUNT(DISTINCT fs.user_id)::NUMERIC) * 100
        ELSE 0
      END, 2
    ) as day7_rate
  FROM first_sessions fs
  LEFT JOIN day1_retained d1 ON fs.user_id = d1.user_id AND fs.city = d1.city
  LEFT JOIN day7_retained d7 ON fs.user_id = d7.user_id AND fs.city = d7.city
  GROUP BY fs.city
  ORDER BY total_users DESC;
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_events;