import { supabase } from '@/integrations/supabase/client';

export interface AppEvent {
  user_id: string;
  event_type: string;
  event_data?: Record<string, any>;
  city?: string;
  category?: string;
  feature?: string;
}

export interface RetentionCohort {
  cohort_date: string;
  total_users: number;
  retained_users: number;
  retention_rate: number;
}

export interface CityRetention {
  city: string;
  total_users: number;
  day1_retained: number;
  day7_retained: number;
  day1_rate: number;
  day7_rate: number;
}

export interface FeatureUsage {
  feature: string;
  usage_count: number;
  unique_users: number;
}

class RetentionAnalyticsService {
  async trackEvent(event: AppEvent): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('app_events').insert({
        user_id: user.id,
        event_type: event.event_type,
        event_data: event.event_data || {},
        city: event.city,
        category: event.category,
        feature: event.feature,
      });

      if (error) {
        console.error('Error tracking event:', error);
      }
    } catch (error) {
      console.error('Error in trackEvent:', error);
    }
  }

  async trackSessionStart(city?: string): Promise<void> {
    await this.trackEvent({
      user_id: '',
      event_type: 'session_start',
      city,
    });
  }

  async trackFeatureUsage(feature: string, category?: string): Promise<void> {
    await this.trackEvent({
      user_id: '',
      event_type: 'feature_usage',
      feature,
      category,
    });
  }

  async getDay1Retention(startDate: string, endDate: string): Promise<RetentionCohort[]> {
    try {
      const { data, error } = await supabase.rpc('calculate_day1_retention', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Day 1 retention:', error);
      return [];
    }
  }

  async getDay7Retention(startDate: string, endDate: string): Promise<RetentionCohort[]> {
    try {
      const { data, error } = await supabase.rpc('calculate_day7_retention', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Day 7 retention:', error);
      return [];
    }
  }

  async getDay30Retention(startDate: string, endDate: string): Promise<RetentionCohort[]> {
    try {
      const { data, error } = await supabase.rpc('calculate_day30_retention', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Day 30 retention:', error);
      return [];
    }
  }

  async getDAU(date: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_dau', {
        target_date: date,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error fetching DAU:', error);
      return 0;
    }
  }

  async getMAU(month: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_mau', {
        target_month: month,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error fetching MAU:', error);
      return 0;
    }
  }

  async getFeatureUsage(startDate: string, endDate: string): Promise<FeatureUsage[]> {
    try {
      const { data, error } = await supabase.rpc('get_feature_usage', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching feature usage:', error);
      return [];
    }
  }

  async getRetentionByCity(startDate: string, endDate: string): Promise<CityRetention[]> {
    try {
      const { data, error } = await supabase.rpc('get_retention_by_city', {
        start_date: startDate,
        end_date: endDate,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching retention by city:', error);
      return [];
    }
  }

  async checkIsAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }
}

export const retentionAnalyticsService = new RetentionAnalyticsService();
