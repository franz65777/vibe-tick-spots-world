/**
 * Get color class for rating (1-10 scale)
 * Returns a smooth gradient from red (1) to yellow (5-6) to green (10)
 */
export const getRatingColor = (rating: number): string => {
  // Clamp rating between 1 and 10
  const clampedRating = Math.max(1, Math.min(10, rating));
  
  // Create smooth gradient: red -> orange -> yellow -> lime -> green
  if (clampedRating <= 2) {
    return 'text-red-600'; // Deep red for 1-2
  } else if (clampedRating <= 3) {
    return 'text-red-500'; // Red for 3
  } else if (clampedRating <= 4) {
    return 'text-orange-600'; // Red-orange for 4
  } else if (clampedRating <= 5) {
    return 'text-orange-500'; // Orange for 5
  } else if (clampedRating <= 6) {
    return 'text-amber-500'; // Amber/yellow-orange for 6
  } else if (clampedRating <= 7) {
    return 'text-yellow-500'; // Yellow for 7
  } else if (clampedRating <= 8) {
    return 'text-lime-500'; // Yellow-green for 8
  } else if (clampedRating <= 9) {
    return 'text-green-500'; // Light green for 9
  } else {
    return 'text-green-600'; // Deep green for 10
  }
};

/**
 * Get fill color class for rating icon (1-10 scale)
 */
export const getRatingFillColor = (rating: number): string => {
  // Clamp rating between 1 and 10
  const clampedRating = Math.max(1, Math.min(10, rating));
  
  if (clampedRating <= 2) {
    return 'fill-red-600';
  } else if (clampedRating <= 3) {
    return 'fill-red-500';
  } else if (clampedRating <= 4) {
    return 'fill-orange-600';
  } else if (clampedRating <= 5) {
    return 'fill-orange-500';
  } else if (clampedRating <= 6) {
    return 'fill-amber-500';
  } else if (clampedRating <= 7) {
    return 'fill-yellow-500';
  } else if (clampedRating <= 8) {
    return 'fill-lime-500';
  } else if (clampedRating <= 9) {
    return 'fill-green-500';
  } else {
    return 'fill-green-600';
  }
};
