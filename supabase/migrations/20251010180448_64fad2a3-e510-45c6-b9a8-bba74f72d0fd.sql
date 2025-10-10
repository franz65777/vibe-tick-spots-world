-- Fix 1: Enable RLS on business_profiles table
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Fix 2: Add admin role validation to all analytics functions

-- Update calculate_day1_retention to require admin role
CREATE OR REPLACE FUNCTION public.calculate_day1_retention(start_date date, end_date date)
RETURNS TABLE(cohort_date date, total_users bigint, retained_users bigint, retention_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

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

-- Update calculate_day7_retention to require admin role
CREATE OR REPLACE FUNCTION public.calculate_day7_retention(start_date date, end_date date)
RETURNS TABLE(cohort_date date, total_users bigint, retained_users bigint, retention_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

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

-- Update calculate_day30_retention to require admin role
CREATE OR REPLACE FUNCTION public.calculate_day30_retention(start_date date, end_date date)
RETURNS TABLE(cohort_date date, total_users bigint, retained_users bigint, retention_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

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

-- Update get_dau to require admin role
CREATE OR REPLACE FUNCTION public.get_dau(target_date date)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result bigint;
BEGIN
  -- Validate admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO result
  FROM public.app_events
  WHERE DATE(created_at) = target_date
    AND event_type = 'session_start';
    
  RETURN result;
END;
$$;

-- Update get_mau to require admin role
CREATE OR REPLACE FUNCTION public.get_mau(target_month date)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result bigint;
BEGIN
  -- Validate admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COUNT(DISTINCT user_id) INTO result
  FROM public.app_events
  WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', target_month)
    AND event_type = 'session_start';
    
  RETURN result;
END;
$$;

-- Update get_feature_usage to require admin role
CREATE OR REPLACE FUNCTION public.get_feature_usage(start_date date, end_date date)
RETURNS TABLE(feature text, usage_count bigint, unique_users bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    ae.feature,
    COUNT(*) as usage_count,
    COUNT(DISTINCT ae.user_id) as unique_users
  FROM public.app_events ae
  WHERE ae.feature IS NOT NULL
    AND DATE(ae.created_at) BETWEEN start_date AND end_date
  GROUP BY ae.feature
  ORDER BY usage_count DESC;
END;
$$;

-- Update get_retention_by_city to require admin role
CREATE OR REPLACE FUNCTION public.get_retention_by_city(start_date date, end_date date)
RETURNS TABLE(city text, total_users bigint, day1_retained bigint, day7_retained bigint, day1_rate numeric, day7_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate admin role
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

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