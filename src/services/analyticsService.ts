
import { supabase } from '@/integrations/supabase/client';
import { trackSecureEvent, getSecureAnalytics } from './secureAnalyticsService';

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

  // Anonymize user agent to browser category only
  private anonymizeUserAgent(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Other';
  }

  // Create anonymous session hash
  private createSessionHash(sessionId: string): string {
    // Create a simple hash to anonymize session ID
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      const char = sessionId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `session_${Math.abs(hash).toString(36)}`;
  }

  // Clean up old analytics data (30+ days)
  async cleanupOldAnalytics(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await Promise.all([
        supabase.rpc('cleanup_old_analytics'),
        supabase
          .from('performance_metrics')
          .delete()
          .lt('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('error_logs')
          .delete()
          .lt('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('api_usage')
          .delete()
          .lt('created_at', thirtyDaysAgo.toISOString())
      ]);
    } catch (error) {
      console.error('Failed to cleanup old analytics:', error);
    }
  }

  // Track user behavior events with security anonymization
  async trackEvent(event: UserAnalyticsEvent): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return; // Skip tracking if no user
      
      // Validate event_type exists
      if (!event.event_type || event.event_type.trim() === '') {
        console.warn('⚠️ Skipping analytics event: event_type is required');
        return;
      }

      // Use secure analytics service with anonymization
      const rawSessionId = event.session_id || this.getSessionId();
      const rawUserAgent = event.user_agent || navigator.userAgent;
      
      await trackSecureEvent({
        event_type: event.event_type,
        event_data: {
          ...event.event_data,
          browser: this.anonymizeUserAgent(rawUserAgent),
          // Remove sensitive search queries and personal data
          ...(event.event_data?.query && {
            query_length: event.event_data.query.length,
            query_type: event.event_data.query.includes('@') ? 'email_search' : 'general_search'
          })
        },
        page_url: event.page_url?.split('?')[0] || window.location.pathname, // Remove query params
        session_id: this.createSessionHash(rawSessionId)
      });
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

  // Log errors with anonymization
  async logError(errorLog: ErrorLog): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const rawUserAgent = errorLog.user_agent || navigator.userAgent;

      // Sanitize error message to remove potential sensitive data
      const sanitizedMessage = errorLog.error_message
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]') // Remove emails
        .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[card]') // Remove card numbers
        .replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[ssn]'); // Remove SSNs

      const { error } = await supabase
        .from('error_logs')
        .insert({
          user_id: userId,
          error_type: errorLog.error_type,
          error_message: sanitizedMessage,
          stack_trace: errorLog.stack_trace?.substring(0, 1000), // Limit stack trace length
          user_agent: this.anonymizeUserAgent(rawUserAgent),
          page_url: errorLog.page_url?.split('?')[0] || window.location.pathname,
          severity: errorLog.severity || 'error',
          metadata: {
            ...errorLog.metadata,
            browser: this.anonymizeUserAgent(rawUserAgent)
          }
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

  // Get analytics dashboard data using secure service
  async getAnalyticsDashboard(timeRange: 'day' | 'week' | 'month' = 'week') {
    try {
      // Auto-cleanup old data when fetching dashboard
      await this.cleanupOldAnalytics();
      
      const startDate = this.getStartDate(timeRange);
      const userId = await this.getCurrentUserId();
      
      if (!userId) return null;

      const [userEvents, performance, errors, apiUsage, secureAnalytics] = await Promise.all([
        this.getUserEvents(startDate),
        this.getPerformanceMetrics(startDate), 
        this.getErrorLogs(startDate),
        this.getApiUsageStats(startDate),
        getSecureAnalytics(userId)
      ]);

      return {
        userEvents: secureAnalytics || userEvents, // Prefer secure analytics
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
    // Use secure analytics function that excludes sensitive data
    const userId = await this.getCurrentUserId();
    if (!userId) return [];
    
    const { data, error } = await supabase
      .rpc('get_anonymized_analytics', { target_user_id: userId });

    if (error) throw error;
    
    // Filter by date and remove any remaining sensitive fields
    return data?.filter((event: any) => event.created_at >= startDate)
      .map((event: any) => ({
        event_type: event.event_type,
        created_at: event.created_at,
        event_data: {
          ...event.event_data,
          // Remove any remaining sensitive data
          session_id: undefined,
          ip_address: undefined,
          user_agent: undefined
        }
      })) || [];
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
      // Create a more privacy-friendly session ID
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
      
      // Auto-expire session storage after 30 minutes
      setTimeout(() => {
        sessionStorage.removeItem('analytics_session_id');
      }, 30 * 60 * 1000);
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
    // Anonymize search queries to protect privacy
    await this.trackEvent({
      event_type: 'search',
      event_data: { 
        query: query, // Will be anonymized in trackEvent
        results_count,
        query_category: this.categorizeQuery(query)
      }
    });
  }

  private categorizeQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('@') || lowerQuery.includes('email')) return 'contact_search';
    if (lowerQuery.match(/\d+/)) return 'numeric_search';
    if (lowerQuery.length > 50) return 'long_query';
    if (lowerQuery.split(' ').length > 5) return 'complex_query';
    return 'general_search';
  }

  async trackPlaceInteraction(placeId: string, action: 'like' | 'save' | 'share' | 'comment') {
    await this.trackEvent({
      event_type: 'place_interaction',
      event_data: { place_id: placeId, action }
    });
  }
}

export const analyticsService = new AnalyticsService();
