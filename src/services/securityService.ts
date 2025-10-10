import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  event_type: string;
  event_data: Record<string, any>;
  page_url?: string;
  user_agent?: string;
}

/**
 * Track security-related events with anonymized data
 */
export const trackSecurityEvent = async (eventData: SecurityEvent) => {
  try {
    const { data, error } = await supabase
      .from('user_analytics')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        event_type: eventData.event_type,
        event_data: eventData.event_data,
        page_url: eventData.page_url,
        user_agent: eventData.user_agent,
        // IP address is collected server-side but not exposed in client queries
      });

    if (error) {
      console.error('Error tracking security event:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Security event tracking error:', error);
    return false;
  }
};

/**
 * @deprecated This function is insecure and should not be used.
 * Client-side rate limiting can be bypassed. Implement rate limiting
 * server-side using Supabase Edge Functions or RLS policies.
 * 
 * SECURITY WARNING: Do not use this function for authentication protection.
 */
export const checkAuthRateLimit = async (): Promise<boolean> => {
  console.warn('checkAuthRateLimit is deprecated and insecure. Use server-side rate limiting instead.');
  return true; // Always return true - this function is no longer functional
};

/**
 * Anonymize sensitive data in text
 */
export const anonymizeData = (text: string): string => {
  // Remove email patterns
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remove phone patterns
  text = text.replace(/(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g, '[PHONE]');
  
  // Remove credit card patterns
  text = text.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');
  
  // Remove SSN patterns
  text = text.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '[SSN]');
  
  return text;
};

/**
 * Validate that user input doesn't contain sensitive data
 */
export const validateUserInput = (input: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check for potential injection attempts
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i;
  if (sqlPatterns.test(input)) {
    errors.push('Input contains potentially dangerous SQL keywords');
  }
  
  // Check for script injection
  const scriptPatterns = /<script[^>]*>.*?<\/script>/gi;
  if (scriptPatterns.test(input)) {
    errors.push('Input contains script tags');
  }
  
  // Check for excessive length
  if (input.length > 1000) {
    errors.push('Input exceeds maximum length');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};