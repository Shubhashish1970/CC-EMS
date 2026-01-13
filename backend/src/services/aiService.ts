import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  logger.warn('GEMINI_API_KEY not configured - AI features will be disabled');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface ExtractedData {
  didAttend?: string | null;
  didRecall?: boolean | null;
  cropsDiscussed?: string[];
  productsDiscussed?: string[];
  hasPurchased?: boolean | null;
  willingToPurchase?: boolean | null;
  likelyPurchaseDate?: string | undefined;
  nonPurchaseReason?: string;
  purchasedProducts?: Array<{ product: string; quantity: string; unit: string }>;
  agentObservations?: string;
}

interface ExtractionContext {
  farmerName?: string;
  activityType?: string;
  crops?: string[];
  products?: string[];
  territory?: string;
}

/**
 * Extract structured data from scratchpad notes using Gemini AI
 */
export const extractDataFromNotes = async (
  notes: string,
  context?: ExtractionContext
): Promise<ExtractedData> => {
  if (!genAI) {
    throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY environment variable.');
  }

  if (!notes || !notes.trim()) {
    throw new Error('Notes cannot be empty');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Build context string
  const contextInfo = context
    ? `
Context Information:
- Farmer Name: ${context.farmerName || 'Unknown'}
- Activity Type: ${context.activityType || 'Unknown'}
- Available Crops: ${context.crops?.join(', ') || 'N/A'}
- Available Products: ${context.products?.join(', ') || 'N/A'}
- Territory: ${context.territory || 'N/A'}
`
    : '';

  const prompt = `You are an AI assistant that extracts structured data from call center agent scratchpad notes.

${contextInfo}

Agent Notes:
${notes}

Extract the following information and return ONLY valid JSON (no markdown, no explanation, no code blocks):
{
  "didAttend": "Yes, I attended" | "No, I missed" | "Don't recall" | "Identity Wrong" | "Not a Farmer" | null,
  "didRecall": true | false | null,
  "cropsDiscussed": ["crop1", "crop2"],
  "productsDiscussed": ["product1", "product2"],
  "hasPurchased": true | false | null,
  "willingToPurchase": true | false | null,
  "likelyPurchaseDate": "YYYY-MM-DD" | undefined,
  "nonPurchaseReason": "Price" | "Availability" | "Brand preference" | "No requirement" | "Not convinced" | "Other" | "custom text" | "",
  "purchasedProducts": [
    {"product": "product name", "quantity": "10", "unit": "Kg" | "gms" | "lt"}
  ],
  "agentObservations": "key observations from conversation (max 500 chars)"
}

Extraction Rules:
1. didAttend: Extract from notes about attendance, identity verification, or farmer status
   - Use "Yes, I attended" if farmer attended
   - Use "No, I missed" if farmer didn't attend
   - Use "Don't recall" if farmer doesn't remember
   - Use "Identity Wrong" if wrong person
   - Use "Not a Farmer" if not a farmer
   - Use null if not mentioned

2. didRecall: Extract from notes about whether farmer remembers meeting/activity content
   - Use true if farmer recalls content
   - Use false if farmer doesn't recall
   - Use null if not mentioned
   - Only extract if didAttend is "Yes, I attended" or "Don't recall"

3. cropsDiscussed: Extract crop names mentioned (match to available crops if provided)
   - Return array of crop names
   - Match case-insensitively to available crops
   - Use empty array if none mentioned

4. productsDiscussed: Extract product names mentioned (match to available products if provided)
   - Return array of product names
   - Match case-insensitively to available products
   - Use empty array if none mentioned

5. hasPurchased: Extract purchase status
   - Use true if farmer purchased/bought products
   - Use false if farmer didn't purchase
   - Use null if not mentioned

6. purchasedProducts: Extract purchase details (only if hasPurchased is true)
   - Extract product name, quantity, and unit
   - Quantity should be numeric string
   - Unit should be "Kg", "gms", or "lt"
   - Return empty array if no purchases mentioned

7. willingToPurchase: Extract future purchase intention (only if hasPurchased is false)
   - Use true if farmer is willing to purchase
   - Use false if farmer is not willing
   - Use null if not mentioned

8. likelyPurchaseDate: Extract date for future purchase (only if willingToPurchase is true)
   - Format as YYYY-MM-DD
   - Extract from phrases like "next month", "in 2 weeks", specific dates
   - Use undefined if not mentioned

9. nonPurchaseReason: Extract reason for not purchasing
   - Match to: "Price", "Availability", "Brand preference", "No requirement", "Not convinced", "Other"
   - Or extract custom reason text
   - Use empty string if not mentioned

10. agentObservations: Extract key observations, comments, or summary
    - Keep concise (max 500 characters)
    - Focus on important points from conversation
    - Use empty string if no observations

Important:
- Only include fields that are clearly mentioned in the notes
- Use null/undefined/empty arrays/empty strings for fields not mentioned
- Match crop/product names to available options (case-insensitive)
- Return valid JSON only, no markdown formatting`;

  try {
    logger.info('Processing notes with Gemini AI', {
      notesLength: notes.length,
      hasContext: !!context,
      farmerName: context?.farmerName,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean JSON response (remove markdown code blocks if present)
    let jsonText = text.trim();
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Remove any leading/trailing whitespace or newlines
    jsonText = jsonText.replace(/^\s+|\s+$/g, '');

    logger.info('Gemini AI response received', { responseLength: jsonText.length });

    const extracted = JSON.parse(jsonText) as ExtractedData;

    // Validate and clean extracted data
    const validated = validateAndCleanExtractedData(extracted, context);

    logger.info('AI extraction successful', {
      fieldsExtracted: Object.keys(validated).length,
      hasCrops: (validated.cropsDiscussed?.length ?? 0) > 0,
      hasProducts: (validated.productsDiscussed?.length ?? 0) > 0,
    });

    return validated;
  } catch (error) {
    logger.error('AI extraction failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof SyntaxError) {
      throw new Error('Failed to parse AI response. Please try again.');
    }
    
    throw new Error('Failed to extract data from notes. Please try again.');
  }
};

/**
 * Validate and clean extracted data
 */
const validateAndCleanExtractedData = (
  data: ExtractedData,
  context?: ExtractionContext
): ExtractedData => {
  const validated: ExtractedData = {};

  // Validate didAttend
  const validDidAttendValues = [
    'Yes, I attended',
    'No, I missed',
    "Don't recall",
    'Identity Wrong',
    'Not a Farmer',
    null,
  ];
  if (data.didAttend === undefined || validDidAttendValues.includes(data.didAttend)) {
    validated.didAttend = data.didAttend ?? null;
  } else {
    validated.didAttend = null;
  }

  // Validate didRecall (only if didAttend allows it)
  if (
    validated.didAttend === 'Yes, I attended' ||
    validated.didAttend === "Don't recall"
  ) {
    if (typeof data.didRecall === 'boolean' || data.didRecall === null) {
      validated.didRecall = data.didRecall ?? null;
    } else {
      validated.didRecall = null;
    }
  } else {
    validated.didRecall = null;
  }

  // Validate cropsDiscussed (only if didRecall is true)
  if (validated.didRecall === true) {
    if (Array.isArray(data.cropsDiscussed)) {
      // Match to available crops if provided
      if (context?.crops && context.crops.length > 0) {
        validated.cropsDiscussed = data.cropsDiscussed
          .map((crop) => {
            const matched = context.crops!.find(
              (c) => c.toLowerCase() === crop.toLowerCase()
            );
            return matched || crop;
          })
          .filter(Boolean);
      } else {
        validated.cropsDiscussed = data.cropsDiscussed.filter(Boolean);
      }
    } else {
      validated.cropsDiscussed = [];
    }
  } else {
    validated.cropsDiscussed = [];
  }

  // Validate productsDiscussed (only if didRecall is true)
  if (validated.didRecall === true) {
    if (Array.isArray(data.productsDiscussed)) {
      // Match to available products if provided
      if (context?.products && context.products.length > 0) {
        validated.productsDiscussed = data.productsDiscussed
          .map((product) => {
            const matched = context.products!.find(
              (p) => p.toLowerCase() === product.toLowerCase()
            );
            return matched || product;
          })
          .filter(Boolean);
      } else {
        validated.productsDiscussed = data.productsDiscussed.filter(Boolean);
      }
    } else {
      validated.productsDiscussed = [];
    }
  } else {
    validated.productsDiscussed = [];
  }

  // Validate hasPurchased
  if (typeof data.hasPurchased === 'boolean' || data.hasPurchased === null) {
    validated.hasPurchased = data.hasPurchased ?? null;
  } else {
    validated.hasPurchased = null;
  }

  // Validate purchasedProducts (only if hasPurchased is true)
  if (validated.hasPurchased === true) {
    if (Array.isArray(data.purchasedProducts)) {
      validated.purchasedProducts = data.purchasedProducts
        .filter((item) => item.product && item.quantity && item.unit)
        .map((item) => ({
          product: String(item.product),
          quantity: String(item.quantity),
          unit: ['Kg', 'gms', 'lt'].includes(item.unit) ? item.unit : 'Kg',
        }));
    } else {
      validated.purchasedProducts = [];
    }
  } else {
    validated.purchasedProducts = [];
  }

  // Validate willingToPurchase (only if hasPurchased is false)
  if (validated.hasPurchased === false) {
    if (typeof data.willingToPurchase === 'boolean' || data.willingToPurchase === null) {
      validated.willingToPurchase = data.willingToPurchase ?? null;
    } else {
      validated.willingToPurchase = null;
    }
  } else {
    validated.willingToPurchase = null;
  }

  // Validate likelyPurchaseDate (only if willingToPurchase is true)
  if (validated.willingToPurchase === true) {
    if (data.likelyPurchaseDate && typeof data.likelyPurchaseDate === 'string') {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(data.likelyPurchaseDate)) {
        validated.likelyPurchaseDate = data.likelyPurchaseDate;
      } else {
        validated.likelyPurchaseDate = undefined;
      }
    } else {
      validated.likelyPurchaseDate = undefined;
    }
  } else {
    validated.likelyPurchaseDate = undefined;
  }

  // Validate nonPurchaseReason
  if (typeof data.nonPurchaseReason === 'string') {
    validated.nonPurchaseReason = data.nonPurchaseReason;
  } else {
    validated.nonPurchaseReason = '';
  }

  // Validate agentObservations
  if (typeof data.agentObservations === 'string') {
    validated.agentObservations = data.agentObservations.substring(0, 500);
  } else {
    validated.agentObservations = '';
  }

  return validated;
};

/**
 * Check if AI service is available
 */
export const isAIServiceAvailable = (): boolean => {
  return !!genAI;
};

/**
 * Get AI service status
 */
export const getAIServiceStatus = () => {
  return {
    available: isAIServiceAvailable(),
    model: 'gemini-1.5-flash',
    hasApiKey: !!GEMINI_API_KEY,
  };
};
