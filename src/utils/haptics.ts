import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * Centralized haptic feedback utility for native iOS/Android feel.
 * Gracefully handles web environment (no-op).
 */
export const haptics = {
  /**
   * Light selection feedback - for toggles, tab switches, selections
   */
  selection: async () => {
    if (isNative) {
      try {
        await Haptics.selectionStart();
        await Haptics.selectionEnd();
      } catch (e) {
        // Silently fail on unsupported devices
      }
    }
  },

  /**
   * Impact feedback - for button taps, interactions
   * @param style - 'light' | 'medium' | 'heavy'
   */
  impact: async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (isNative) {
      try {
        const styleMap = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        };
        await Haptics.impact({ style: styleMap[style] });
      } catch (e) {
        // Silently fail on unsupported devices
      }
    }
  },

  /**
   * Success notification - for saves, completions, confirmations
   */
  success: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch (e) {
        // Silently fail on unsupported devices
      }
    }
  },

  /**
   * Warning notification - for destructive action confirmations
   */
  warning: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Warning });
      } catch (e) {
        // Silently fail on unsupported devices
      }
    }
  },

  /**
   * Error notification - for errors, failed actions
   */
  error: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch (e) {
        // Silently fail on unsupported devices
      }
    }
  },
};
