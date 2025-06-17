
import { supabase } from '@/integrations/supabase/client';

export interface UserAnalyticsEvent {
  event_type: string;
  event_data?: Record<string, any>;
  page_url?: string;
  user_agent?: string;
  session_id?: string;
}

export interface PerformanceMetric {
  metric_type: string;
  metric_value: number;
  metric_unit: string;
  endpoint?: string;
  metadata?: Record<string, any>;
}

export interface ErrorLog {
  error_type: string;
  error_message: string;
  stack_trace?: string;
  page_url?: string;
  user_agent?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, any>;
}

export interface ApiUsage {
  endpoint: string;
  method: string;
  response_status: number;
  response_time_ms?: number;
  request_size?: number;
  response_size?: number;
}

class AnalyticsService {
  // Get current user ID
  private async getCurrentUserId(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }

  // Track user behavior events
  async trackEvent(event: UserAnalyticsEvent): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return; // Skip tracking if no user

      const { error } = await supabase
        .from('user_analytics')
        .insert({
          user_id: userId,
          event_type: event.event_type,
          event_data: event.event_data || {},
          user_agent: event.user_agent || navigator.userAgent,
          page_url: event.page_url || window.location.href,
          session_id: event.session_id || this.getSessionId()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  // Track performance metrics
  async trackPerformance(metric: PerformanceMetric): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('performance_metrics')
        .insert({
          user_id: userId,
          metric_type: metric.metric_type,
          metric_value: metric.metric_value,
          metric_unit: metric.metric_unit,
          endpoint: metric.endpoint,
          metadata: metric.metadata || {}
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to track performance metric:', error);
    }
  }

  // Log errors
  async logError(errorLog: ErrorLog): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('error_logs')
        .insert({
          user_id: userId,
          error_type: errorLog.error_type,
          error_message: errorLog.error_message,
          stack_trace: errorLog.stack_trace,
          user_agent: errorLog.user_agent || navigator.userAgent,
          page_url: errorLog.page_url || window.location.href,
          severity: errorLog.severity || 'error',
          metadata: errorLog.metadata || {}
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }

  // Track API usage
  async trackApiUsage(usage: ApiUsage): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const { error } = await supabase
        .from('api_usage')
        .insert({
          user_id: userId,
          endpoint: usage.endpoint,
          method: usage.method,
          response_status: usage.response_status,
          response_time_ms: usage.response_time_ms,
          request_size: usage.request_size,
          response_size: usage.response_size
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to track API usage:', error);
    }
  }

  // Get analytics dashboard data
  async getAnalyticsDashboard(timeRange: 'day' | 'week' | 'month' = 'week') {
    try {
      const startDate = this.getStartDate(timeRange);

      const [userEvents, performance, errors, apiUsage] = await Promise.all([
        this.getUserEvents(startDate),
        this.getPerformanceMetrics(startDate),
        this.getErrorLogs(startDate),
        this.getApiUsageStats(startDate)
      ]);

      return {
        userEvents,
        performance,
        errors,
        apiUsage
      };
    } catch (error) {
      console.error('Failed to get analytics dashboard:', error);
      return null;
    }
  }

  private async getUserEvents(startDate: string) {
    const { data, error } = await supabase
      .from('user_analytics')
      .select('event_type, created_at, event_data')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  private async getPerformanceMetrics(startDate: string) {
    const { data, error } = await supabase
      .from('performance_metrics')
      .select('metric_type, metric_value, metric_unit, created_at')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  private async getErrorLogs(startDate: string) {
    const { data, error } = await supabase
      .from('error_logs')
      .select('error_type, severity, created_at, resolved')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  private async getApiUsageStats(startDate: string) {
    const { data, error } = await supabase
      .from('api_usage')
      .select('endpoint, method, response_status, response_time_ms, created_at')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  private getStartDate(timeRange: 'day' | 'week' | 'month'): string {
    const now = new Date();
    switch (timeRange) {
      case 'day':
        now.setDate(now.getDate() - 1);
        break;
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
    }
    return now.toISOString();
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  // Convenience methods for common events
  async trackPageView(page: string) {
    await this.trackEvent({
      event_type: 'page_view',
      event_data: { page }
    });
  }

  async trackUserAction(action: string, data?: Record<string, any>) {
    await this.trackEvent({
      event_type: 'user_action',
      event_data: { action, ...data }
    });
  }

  async trackSearch(query: string, results_count: number) {
    await this.trackEvent({
      event_type: 'search',
      event_data: { query, results_count }
    });
  }

  async trackPlaceInteraction(placeId: string, action: 'like' | 'save' | 'share' | 'comment') {
    await this.trackEvent({
      event_type: 'place_interaction',
      event_data: { place_id: placeId, action }
    });
  }
}

export const analyticsService = new AnalyticsService();
