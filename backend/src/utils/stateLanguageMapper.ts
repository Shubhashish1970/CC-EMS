import { StateLanguageMapping } from '../models/StateLanguageMapping.js';
import logger from '../config/logger.js';

/**
 * Extract state name from territory string
 * Format: "State Zone" -> "State"
 * Note: This is kept for backward compatibility. Primary method is to use state directly from FFA API.
 */
export const extractStateFromTerritory = (territory: string): string => {
  if (!territory || typeof territory !== 'string') {
    return '';
  }
  
  // Remove " Zone" suffix if present
  const state = territory.replace(/\s+Zone$/i, '').trim();
  return state || territory;
};

/**
 * Get preferred language for a state
 * @param state - State name (e.g., "Uttar Pradesh")
 * @returns Primary language for the state, or 'Hindi' as fallback
 */
export const getLanguageForState = async (state: string): Promise<string> => {
  if (!state || !state.trim()) {
    logger.warn('getLanguageForState: Empty state provided, using Hindi as fallback');
    return 'Hindi'; // Default fallback
  }

  try {
    const mapping = await StateLanguageMapping.findOne({
      state: state.trim(),
      isActive: true,
    });

    if (mapping) {
      logger.debug(`getLanguageForState: Found mapping for ${state} → ${mapping.primaryLanguage}`);
      return mapping.primaryLanguage;
    }

    // Fallback: Try case-insensitive match
    const caseInsensitiveMapping = await StateLanguageMapping.findOne({
      $expr: {
        $eq: [{ $toLower: '$state' }, state.trim().toLowerCase()],
      },
      isActive: true,
    });

    if (caseInsensitiveMapping) {
      logger.warn(`getLanguageForState: Found case-insensitive match for ${state} → ${caseInsensitiveMapping.primaryLanguage}`);
      return caseInsensitiveMapping.primaryLanguage;
    }

    // Final fallback
    logger.warn(`getLanguageForState: No mapping found for state "${state}", using Hindi as fallback`);
    return 'Hindi';
  } catch (error) {
    logger.error(`getLanguageForState: Error looking up language for state "${state}":`, error);
    return 'Hindi'; // Safe fallback
  }
};

/**
 * Get preferred language from territory (extracts state and maps to language)
 * Note: This is kept for backward compatibility. Primary method is to use state directly.
 * @param territory - Territory string (e.g., "Uttar Pradesh Zone")
 * @returns Primary language for the state
 */
export const getLanguageFromTerritory = async (territory: string): Promise<string> => {
  const state = extractStateFromTerritory(territory);
  return getLanguageForState(state);
};
