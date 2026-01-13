import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  extractDataFromNotes,
  getAIServiceStatus,
  isAIServiceAvailable,
} from '../services/aiService.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/ai/extract
 * @desc    Extract structured data from scratchpad notes using Gemini AI
 * @access  Private
 */
router.post(
  '/extract',
  [
    body('notes')
      .notEmpty()
      .withMessage('Notes are required')
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ min: 1, max: 5000 })
      .withMessage('Notes must be between 1 and 5000 characters'),
    body('context').optional().isObject().withMessage('Context must be an object'),
    body('context.farmerName').optional().isString(),
    body('context.activityType').optional().isString(),
    body('context.crops').optional().isArray(),
    body('context.products').optional().isArray(),
    body('context.territory').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            errors: errors.array(),
          },
        });
      }

      // Check if AI service is available
      if (!isAIServiceAvailable()) {
        const error: AppError = new Error(
          'AI service is not available. GEMINI_API_KEY is not configured.'
        );
        error.statusCode = 503;
        throw error;
      }

      const { notes, context } = req.body;
      const authReq = req as AuthRequest;

      logger.info('AI extraction request received', {
        userId: authReq.user._id,
        userEmail: authReq.user.email,
        notesLength: notes.length,
        hasContext: !!context,
      });

      // Extract data from notes
      const extractedData = await extractDataFromNotes(notes, context);

      logger.info('AI extraction completed successfully', {
        userId: authReq.user._id,
        fieldsExtracted: Object.keys(extractedData).length,
      });

      res.json({
        success: true,
        message: 'Data extracted successfully',
        data: extractedData,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AI extraction error', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Return user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('GEMINI_API_KEY') || error.message.includes('not configured')) {
          return res.status(503).json({
            success: false,
            error: {
              message: 'AI service is not available. GEMINI_API_KEY is not configured.',
            },
          });
        }
        if (error.message.includes('parse') || error.message.includes('JSON')) {
          return res.status(500).json({
            success: false,
            error: {
              message: 'Failed to parse AI response. Please try again with different notes.',
            },
          });
        }
      }
      
      next(error);
    }
  }
);

/**
 * @route   GET /api/ai/status
 * @desc    Get AI service status
 * @access  Private
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = getAIServiceStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
