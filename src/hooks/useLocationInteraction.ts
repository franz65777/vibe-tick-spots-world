import { useCallback } from 'react';
import { trackInteraction } from '@/services/recommendationService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook to track user interactions with locations
 * Automatically includes user authentication
 */
export const useLocationInteraction = () => {
  const { user } = useAuth();

  const trackAction = useCallback(
    async (
      locationId: string,
      actionType: 'like' | 'save' | 'visit' | 'share' | 'view',
      options?: {
        showToast?: boolean;
        toastMessage?: string;
      }
    ) => {
      if (!user?.id) {
        console.warn('Cannot track interaction: User not authenticated');
        return;
      }

      try {
        await trackInteraction(user.id, locationId, actionType);
        
        if (options?.showToast) {
          toast.success(options.toastMessage || 'Action recorded');
        }
      } catch (error) {
        console.error('Error tracking interaction:', error);
        // Don't show toast for tracking errors as they're non-critical
      }
    },
    [user?.id]
  );

  const trackLike = useCallback(
    (locationId: string) => trackAction(locationId, 'like'),
    [trackAction]
  );

  const trackSave = useCallback(
    (locationId: string) => trackAction(locationId, 'save'),
    [trackAction]
  );

  const trackVisit = useCallback(
    (locationId: string) => trackAction(locationId, 'visit'),
    [trackAction]
  );

  const trackShare = useCallback(
    (locationId: string) => trackAction(locationId, 'share'),
    [trackAction]
  );

  const trackView = useCallback(
    (locationId: string) => trackAction(locationId, 'view'),
    [trackAction]
  );

  return {
    trackLike,
    trackSave,
    trackVisit,
    trackShare,
    trackView,
    trackAction,
  };
};
