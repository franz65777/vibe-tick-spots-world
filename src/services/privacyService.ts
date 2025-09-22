import { supabase } from '@/integrations/supabase/client';

/**
 * Privacy-focused service for data cleanup and protection
 */
export class PrivacyService {
  
  /**
   * Run data cleanup to remove old sensitive data
   */
  static async runDataCleanup() {
    try {
      const { error } = await supabase.rpc('cleanup_sensitive_data');
      
      if (error) {
        console.error('Error running data cleanup:', error);
        return false;
      }
      
      console.log('Privacy data cleanup completed successfully');
      return true;
    } catch (error) {
      console.error('Privacy cleanup error:', error);
      return false;
    }
  }

  /**
   * Enforce data retention policies
   */
  static async enforceDataRetention() {
    try {
      const { error } = await supabase.rpc('enforce_data_retention');
      
      if (error) {
        console.error('Error enforcing data retention:', error);
        return false;
      }
      
      console.log('Data retention policies enforced successfully');
      return true;
    } catch (error) {
      console.error('Data retention error:', error);
      return false;
    }
  }

  /**
   * Get secure business contact info (only if user has legitimate access)
   */
  static async getBusinessContactInfo(businessId: string) {
    try {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) {
        return null;
      }

      const { data, error } = await supabase
        .rpc('get_business_contact_info', {
          business_profile_id: businessId,
          requesting_user_id: currentUser.data.user.id
        });

      if (error) {
        console.error('Error fetching business contact info:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Business contact access error:', error);
      return null;
    }
  }

  /**
   * Sanitize user input before storage
   */
  static sanitizeUserInput(input: string): string {
    if (!input) return '';
    
    // Remove potential XSS patterns
    const sanitized = input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
    
    // Limit length to prevent data overflow
    return sanitized.length > 1000 ? sanitized.substring(0, 1000) : sanitized;
  }

  /**
   * Check if text contains sensitive data patterns
   */
  static containsSensitiveData(text: string): boolean {
    const sensitivePatterns = [
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
      /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // Phone
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(text));
  }

  /**
   * Initialize privacy service - run cleanup on app start
   */
  static async initialize() {
    // Run cleanup when service initializes
    setTimeout(() => {
      this.runDataCleanup();
      this.enforceDataRetention();
    }, 5000); // Delay to not impact app startup
    
    // Set up periodic cleanup (every 24 hours)
    setInterval(() => {
      this.runDataCleanup();
      this.enforceDataRetention();
    }, 24 * 60 * 60 * 1000);
  }
}

// Auto-initialize the privacy service
if (typeof window !== 'undefined') {
  PrivacyService.initialize();
}

export const privacyService = PrivacyService;