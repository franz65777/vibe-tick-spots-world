/**
 * Get color class for rating (1-10 scale)
 * Returns a gradient from red (1) to orange (5) to green (10)
 */
export const getRatingColor = (rating: number): string => {
  if (rating <= 3) {
    // Red range (1-3)
    return 'text-red-500';
  } else if (rating <= 5) {
    // Orange-red range (4-5)
    return 'text-orange-600';
  } else if (rating <= 7) {
    // Orange-yellow range (6-7)
    return 'text-orange-500';
  } else if (rating <= 8) {
    // Yellow-green range (8)
    return 'text-yellow-500';
  } else {
    // Green range (9-10)
    return 'text-green-500';
  }
};

/**
 * Get fill color class for rating icon (1-10 scale)
 */
export const getRatingFillColor = (rating: number): string => {
  if (rating <= 3) {
    return 'fill-red-500';
  } else if (rating <= 5) {
    return 'fill-orange-600';
  } else if (rating <= 7) {
    return 'fill-orange-500';
  } else if (rating <= 8) {
    return 'fill-yellow-500';
  } else {
    return 'fill-green-500';
  }
};
