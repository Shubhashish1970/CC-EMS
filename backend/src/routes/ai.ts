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
        body: req.body, // Log request body for debugging
      });
      
      // Map specific errors to appropriate HTTP status codes
      let statusCode = 500;
      let userMessage = 'Failed to extract data from notes. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('GEMINI_API_KEY') || error.message.includes('not configured')) {
          statusCode = 503;
          userMessage = 'AI service is not available. GEMINI_API_KEY is not configured.';
        } else if (error.message.includes('blocked') || error.message.includes('safety')) {
          statusCode = 400;
          userMessage = 'AI response was blocked. Please rephrase your notes.';
        } else if (error.message.includes('404') || error.message.includes('not found')) {
          statusCode = 503;
          userMessage = 'AI service model not available. Please contact administrator.';
        } else if (error.message.includes('parse') || error.message.includes('JSON')) {
          statusCode = 500;
          userMessage = 'Failed to parse AI response. Please try again with different notes.';
        } else if (error.message.includes('Empty response')) {
          statusCode = 500;
          userMessage = 'AI service returned empty response. Please try again.';
        }
      }
      
      return res.status(statusCode).json({
        success: false,
        error: {
          message: userMessage,
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
      });
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
    const status = await getAIServiceStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
