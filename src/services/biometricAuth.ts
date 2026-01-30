import { Capacitor } from '@capacitor/core';
import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';

const CREDENTIALS_SERVER = 'com.spott.app';

export interface BiometricCredentials {
  username: string;
  password: string;
}

/**
 * Check if biometric authentication is available on this device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch (error) {
    console.error('Biometric check error:', error);
    return false;
  }
};

/**
 * Get the type of biometric available (Face ID, Touch ID, etc.)
 */
export const getBiometricType = async (): Promise<BiometryType | null> => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const result = await NativeBiometric.isAvailable();
    return result.biometryType;
  } catch (error) {
    console.error('Biometric type check error:', error);
    return null;
  }
};

/**
 * Get a user-friendly name for the biometric type
 */
export const getBiometricName = async (): Promise<string> => {
  const type = await getBiometricType();
  
  switch (type) {
    case BiometryType.FACE_ID:
      return 'Face ID';
    case BiometryType.TOUCH_ID:
      return 'Touch ID';
    case BiometryType.FINGERPRINT:
      return 'Fingerprint';
    case BiometryType.FACE_AUTHENTICATION:
      return 'Face Authentication';
    case BiometryType.IRIS_AUTHENTICATION:
      return 'Iris Authentication';
    default:
      return 'Biometric';
  }
};

/**
 * Save credentials securely after successful login
 */
export const saveCredentials = async (username: string, password: string): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await NativeBiometric.setCredentials({
      username,
      password,
      server: CREDENTIALS_SERVER,
    });
    return true;
  } catch (error) {
    console.error('Save credentials error:', error);
    return false;
  }
};

/**
 * Check if we have saved credentials
 */
export const hasStoredCredentials = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const credentials = await NativeBiometric.getCredentials({
      server: CREDENTIALS_SERVER,
    });
    return !!(credentials.username && credentials.password);
  } catch (error) {
    // No credentials stored
    return false;
  }
};

/**
 * Verify with biometrics and retrieve stored credentials
 */
export const authenticateAndGetCredentials = async (
  reason: string = 'Sign in to Spott'
): Promise<BiometricCredentials | null> => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    // First verify biometrics
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Spott Login',
      subtitle: 'Use biometrics to sign in',
      description: 'Place your finger on the sensor or look at the camera',
    });

    // If verification succeeded, get credentials
    const credentials = await NativeBiometric.getCredentials({
      server: CREDENTIALS_SERVER,
    });

    return {
      username: credentials.username,
      password: credentials.password,
    };
  } catch (error) {
    console.error('Biometric auth error:', error);
    return null;
  }
};

/**
 * Delete stored credentials
 */
export const deleteCredentials = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await NativeBiometric.deleteCredentials({
      server: CREDENTIALS_SERVER,
    });
    return true;
  } catch (error) {
    console.error('Delete credentials error:', error);
    return false;
  }
};
