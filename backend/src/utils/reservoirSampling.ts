/**
 * Reservoir Sampling Algorithm
 * Selects k random items from a stream of n items with equal probability
 * Time Complexity: O(n)
 * Space Complexity: O(k)
 */

export const reservoirSampling = <T>(items: T[], sampleSize: number): T[] => {
  if (sampleSize >= items.length) {
    return items;
  }

  if (sampleSize <= 0) {
    return [];
  }

  // Initialize reservoir with first k items
  const reservoir: T[] = items.slice(0, sampleSize);

  // Process remaining items
  for (let i = sampleSize; i < items.length; i++) {
    // Generate random number between 0 and i (inclusive)
    const j = Math.floor(Math.random() * (i + 1));

    // If random number is less than sample size, replace reservoir[j] with items[i]
    if (j < sampleSize) {
      reservoir[j] = items[i];
    }
  }

  return reservoir;
};

/**
 * Calculate sample size based on percentage
 */
export const calculateSampleSize = (total: number, percentage: number): number => {
  if (percentage <= 0 || percentage > 100) {
    throw new Error('Percentage must be between 1 and 100');
  }

  const sampleSize = Math.ceil((total * percentage) / 100);
  return Math.max(1, Math.min(sampleSize, total)); // Ensure at least 1, at most total
};

