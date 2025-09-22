import { supabase } from '@/integrations/supabase/client';

class AnalyticsCleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start automatic cleanup service (runs every 24 hours)
  startAutoCleanup(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting analytics cleanup service...');
    
    // Run cleanup immediately
    this.runCleanup();
    
    // Set up recurring cleanup every 24 hours
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  }

  // Stop automatic cleanup service
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('Analytics cleanup service stopped');
  }

  // Manual cleanup execution
  async runCleanup(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log('Running analytics cleanup for data older than:', thirtyDaysAgo.toISOString());
      
      const cleanupPromises = [
        // Clean user analytics using the database function
        supabase.rpc('cleanup_old_analytics'),
        
        // Clean performance metrics
        supabase
          .from('performance_metrics')
          .delete()
          .lt('created_at', thirtyDaysAgo.toISOString()),
        
        // Clean error logs
        supabase
          .from('error_logs')
          .delete()
          .lt('created_at', thirtyDaysAgo.toISOString()),
        
        // Clean API usage data
        supabase
          .from('api_usage')
          .delete()
          .lt('created_at', thirtyDaysAgo.toISOString()),
        
        // Clean old search history
        supabase
          .from('search_history')
          .delete()
          .lt('searched_at', thirtyDaysAgo.toISOString())
      ];

      const results = await Promise.allSettled(cleanupPromises);
      
      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Cleanup operation ${index} failed:`, result.reason);
        }
      });
      
      console.log('Analytics cleanup completed successfully');
      
      // Update last cleanup timestamp
      localStorage.setItem('last_analytics_cleanup', Date.now().toString());
      
    } catch (error) {
      console.error('Analytics cleanup failed:', error);
    }
  }

  // Check if cleanup is needed (hasn't run in 24 hours)
  isCleanupNeeded(): boolean {
    const lastCleanup = localStorage.getItem('last_analytics_cleanup');
    if (!lastCleanup) return true;
    
    const lastCleanupTime = parseInt(lastCleanup);
    const now = Date.now();
    const hoursElapsed = (now - lastCleanupTime) / (1000 * 60 * 60);
    
    return hoursElapsed >= 24;
  }

  // Initialize cleanup service for the application
  initialize(): void {
    // Run cleanup if needed on initialization
    if (this.isCleanupNeeded()) {
      this.runCleanup();
    }
    
    // Start the auto cleanup service
    this.startAutoCleanup();
  }

  // Cleanup when the application is being closed
  destroy(): void {
    this.stopAutoCleanup();
  }
}

// Export singleton instance
export const analyticsCleanupService = new AnalyticsCleanupService();

// Auto-start cleanup service when this module is loaded
// Only in browser environment
if (typeof window !== 'undefined') {
  analyticsCleanupService.initialize();
  
  // Clean up when page is being unloaded
  window.addEventListener('beforeunload', () => {
    analyticsCleanupService.destroy();
  });
}