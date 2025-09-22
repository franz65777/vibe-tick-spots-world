/**
 * Privacy utility functions for data anonymization and protection
 */

// Anonymize email addresses in text
export const anonymizeEmails = (text: string): string => {
  return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
};

// Anonymize phone numbers in text
export const anonymizePhoneNumbers = (text: string): string => {
  return text.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[phone]');
};

// Anonymize credit card numbers in text
export const anonymizeCreditCards = (text: string): string => {
  return text.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[card]');
};

// Anonymize SSNs in text
export const anonymizeSSNs = (text: string): string => {
  return text.replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, '[ssn]');
};

// Anonymize IP addresses in text
export const anonymizeIPs = (text: string): string => {
  return text.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');
};

// Comprehensive text sanitization
export const sanitizeText = (text: string): string => {
  let sanitized = text;
  sanitized = anonymizeEmails(sanitized);
  sanitized = anonymizePhoneNumbers(sanitized);
  sanitized = anonymizeCreditCards(sanitized);
  sanitized = anonymizeSSNs(sanitized);
  sanitized = anonymizeIPs(sanitized);
  return sanitized;
};

// Generate anonymous hash from string
export const createAnonymousHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `anon_${Math.abs(hash).toString(36)}`;
};

// Check if text contains sensitive data
export const containsSensitiveData = (text: string): boolean => {
  const patterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/, // SSN
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // Phone
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/ // IP address
  ];
  
  return patterns.some(pattern => pattern.test(text));
};

// Remove query parameters from URLs that might contain sensitive data
export const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Keep only the pathname, remove search params and hash
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
    // If URL parsing fails, just remove query string manually
    return url.split('?')[0].split('#')[0];
  }
};

// Limit text length to prevent data leakage through large payloads
export const limitTextLength = (text: string, maxLength: number = 1000): string => {
  return text.length > maxLength ? text.substring(0, maxLength) + '[truncated]' : text;
};

// Enhanced location privacy - add noise to coordinates
export const addLocationNoise = (lat: number, lng: number, radiusMeters: number = 100): { lat: number, lng: number } => {
  // Convert meters to degrees (rough approximation)
  const deltaLat = radiusMeters / 111000; // 1 degree ≈ 111km
  const deltaLng = radiusMeters / (111000 * Math.cos(lat * Math.PI / 180));
  
  return {
    lat: lat + (Math.random() - 0.5) * 2 * deltaLat,
    lng: lng + (Math.random() - 0.5) * 2 * deltaLng
  };
};

// Generate privacy-safe user identifier
export const generatePrivacySafeId = (userId: string): string => {
  return `user_${createAnonymousHash(userId)}`;
};

// Clean sensitive data from objects
export const cleanSensitiveData = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = ['email', 'phone', 'ssn', 'creditcard', 'password', 'token', 'ip_address'];
  const cleaned = { ...obj };
  
  for (const key in cleaned) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      delete cleaned[key];
    } else if (typeof cleaned[key] === 'string') {
      cleaned[key] = sanitizeText(cleaned[key]);
    } else if (typeof cleaned[key] === 'object') {
      cleaned[key] = cleanSensitiveData(cleaned[key]);
    }
  }
  
  return cleaned;
};
