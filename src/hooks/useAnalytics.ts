
import { useEffect } from 'react';
import { analyticsService } from '@/services/analyticsService';

export const useAnalytics = () => {
  useEffect(() => {
    // Track page view when component mounts
    const currentPage = window.location.pathname;
    analyticsService.trackPageView(currentPage);

    // Run cleanup on first load (throttled to once per session)
    const hasRunCleanup = sessionStorage.getItem('analytics_cleanup_done');
    if (!hasRunCleanup) {
      analyticsService.cleanupOldAnalytics().then(() => {
        sessionStorage.setItem('analytics_cleanup_done', 'true');
      });
    }

    // Track performance metrics
    const trackPerformance = () => {
      if ('performance' in window && 'getEntriesByType' in performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          analyticsService.trackPerformance({
            metric_type: 'page_load',
            metric_value: navigation.loadEventEnd - navigation.loadEventStart,
            metric_unit: 'ms',
            endpoint: currentPage
          });
        }
      }
    };

    // Track performance after page load
    if (document.readyState === 'complete') {
      trackPerformance();
    } else {
      window.addEventListener('load', trackPerformance);
    }

    // Track errors
    const handleError = (event: ErrorEvent) => {
      analyticsService.logError({
        error_type: 'javascript_error',
        error_message: event.message,
        stack_trace: event.error?.stack,
        severity: 'error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analyticsService.logError({
        error_type: 'unhandled_promise_rejection',
        error_message: String(event.reason),
        severity: 'error',
        metadata: {
          reason: event.reason
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('load', trackPerformance);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return {
    trackEvent: analyticsService.trackEvent.bind(analyticsService),
    trackUserAction: analyticsService.trackUserAction.bind(analyticsService),
    trackSearch: analyticsService.trackSearch.bind(analyticsService),
    trackPlaceInteraction: analyticsService.trackPlaceInteraction.bind(analyticsService),
    trackPerformance: analyticsService.trackPerformance.bind(analyticsService),
    logError: analyticsService.logError.bind(analyticsService)
  };
};
