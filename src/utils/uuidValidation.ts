/**
 * UUID validation utility for database queries
 * Prevents "invalid input syntax for type uuid" errors when passing
 * Google Place IDs or other non-UUID strings to UUID columns.
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 */
export const isValidUUID = (str: string | null | undefined): boolean => {
  if (!str) return false;
  return UUID_REGEX.test(str);
};

/**
 * Filter an array to only include valid UUIDs
 */
export const filterValidUUIDs = (ids: (string | null | undefined)[]): string[] => {
  return ids.filter((id): id is string => isValidUUID(id));
};

/**
 * Safely create a location lookup filter that handles both UUIDs and Google Place IDs
 * Returns separate arrays for UUID queries and google_place_id queries
 */
export const separateLocationIds = (ids: (string | null | undefined)[]): {
  uuids: string[];
  googlePlaceIds: string[];
} => {
  const uuids: string[] = [];
  const googlePlaceIds: string[] = [];
  
  for (const id of ids) {
    if (!id) continue;
    if (isValidUUID(id)) {
      uuids.push(id);
    } else {
      // Assume non-UUID strings are Google Place IDs
      googlePlaceIds.push(id);
    }
  }
  
  return { uuids, googlePlaceIds };
};
