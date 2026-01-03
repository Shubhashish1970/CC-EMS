import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { MasterCrop, MasterProduct } from '../models/MasterData.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ==================== CROPS ====================

// @route   GET /api/master-data/crops
// @desc    Get all active crops (for dropdown)
// @access  Private (all authenticated users)
router.get('/crops', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activeOnly = 'true' } = req.query;
    const query: any = {};
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }

    const crops = await MasterCrop.find(query)
      .sort({ name: 1 })
      .select('name isActive');

    res.json({
      success: true,
      data: { crops },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/master-data/crops/all
// @desc    Get all crops (including inactive) - Admin only
// @access  Private (MIS Admin, Core Sales Head)
router.get(
  '/crops/all',
  requirePermission('master_data.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const crops = await MasterCrop.find().sort({ name: 1 });

      res.json({
        success: true,
        data: { crops },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/master-data/crops
// @desc    Create new crop - Admin only
// @access  Private (MIS Admin, Core Sales Head)
router.post(
  '/crops',
  requirePermission('master_data.create'),
  [
    body('name').trim().notEmpty().withMessage('Crop name is required'),
    body('isActive').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { name, isActive = true } = req.body;

      // Check if crop already exists
      const existing = await MasterCrop.findOne({ name: name.toUpperCase() });
      if (existing) {
        const error: AppError = new Error('Crop already exists');
        error.statusCode = 409;
        throw error;
      }

      const crop = new MasterCrop({
        name: name.toUpperCase(),
        isActive,
      });

      await crop.save();

      logger.info(`Master crop created: ${crop.name} by ${(req as AuthRequest).user.email}`);

      res.status(201).json({
        success: true,
        message: 'Crop created successfully',
        data: { crop },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/master-data/crops/:id
// @desc    Update crop - Admin only
// @access  Private (MIS Admin, Core Sales Head)
router.put(
  '/crops/:id',
  requirePermission('master_data.update'),
  [
    body('name').optional().trim().notEmpty(),
    body('isActive').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { id } = req.params;
      const { name, isActive } = req.body;

      const crop = await MasterCrop.findById(id);
      if (!crop) {
        const error: AppError = new Error('Crop not found');
        error.statusCode = 404;
        throw error;
      }

      if (name && name.toUpperCase() !== crop.name) {
        // Check if new name already exists
        const existing = await MasterCrop.findOne({ name: name.toUpperCase() });
        if (existing) {
          const error: AppError = new Error('Crop name already exists');
          error.statusCode = 409;
          throw error;
        }
        crop.name = name.toUpperCase();
      }

      if (isActive !== undefined) {
        crop.isActive = isActive;
      }

      await crop.save();

      logger.info(`Master crop updated: ${crop.name} by ${(req as AuthRequest).user.email}`);

      res.json({
        success: true,
        message: 'Crop updated successfully',
        data: { crop },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/master-data/crops/:id
// @desc    Delete crop (soft delete by setting isActive=false) - Admin only
// @access  Private (MIS Admin, Core Sales Head)
router.delete(
  '/crops/:id',
  requirePermission('master_data.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const crop = await MasterCrop.findById(id);
      if (!crop) {
        const error: AppError = new Error('Crop not found');
        error.statusCode = 404;
        throw error;
      }

      // Soft delete
      crop.isActive = false;
      await crop.save();

      logger.info(`Master crop deactivated: ${crop.name} by ${(req as AuthRequest).user.email}`);

      res.json({
        success: true,
        message: 'Crop deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== PRODUCTS ====================

// @route   GET /api/master-data/products
// @desc    Get all active products (for dropdown)
// @access  Private (all authenticated users)
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activeOnly = 'true' } = req.query;
    const query: any = {};
    
    if (activeOnly === 'true') {
      query.isActive = true;
    }

    const products = await MasterProduct.find(query)
      .sort({ name: 1 })
      .select('name isActive');

    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/master-data/products/all
// @desc    Get all products (including inactive) - Admin only
// @access  Private (MIS Admin, Core Sales Head)
router.get(
  '/products/all',
  requirePermission('master_data.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await MasterProduct.find().sort({ name: 1 });

      res.json({
        success: true,
        data: { products },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/master-data/products
// @desc    Create new product - Admin only
// @access  Private (MIS Admin, Core Sales Head)
router.post(
  '/products',
  requirePermission('master_data.create'),
  [
    body('name').trim().notEmpty().withMessage('Product name is required'),
    body('isActive').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { name, isActive = true } = req.body;

      // Check if product already exists
      const existing = await MasterProduct.findOne({ name });
      if (existing) {
        const error: AppError = new Error('Product already exists');
        error.statusCode = 409;
        throw error;
      }

      const product = new MasterProduct({
        name,
        isActive,
      });

      await product.save();

      logger.info(`Master product created: ${product.name} by ${(req as AuthRequest).user.email}`);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/master-data/products/:id
// @desc    Update product - Admin only
// @access  Private (MIS Admin, Core Sales Head)
router.put(
  '/products/:id',
  requirePermission('master_data.update'),
  [
    body('name').optional().trim().notEmpty(),
    body('isActive').optional().isBoolean(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { id } = req.params;
      const { name, isActive } = req.body;

      const product = await MasterProduct.findById(id);
      if (!product) {
        const error: AppError = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      if (name && name !== product.name) {
        // Check if new name already exists
        const existing = await MasterProduct.findOne({ name });
        if (existing) {
          const error: AppError = new Error('Product name already exists');
          error.statusCode = 409;
          throw error;
        }
        product.name = name;
      }

      if (isActive !== undefined) {
        product.isActive = isActive;
      }

      await product.save();

      logger.info(`Master product updated: ${product.name} by ${(req as AuthRequest).user.email}`);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: { product },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   DELETE /api/master-data/products/:id
// @desc    Delete product (soft delete by setting isActive=false) - Admin only
// @access  Private (MIS Admin, Core Sales Head)
router.delete(
  '/products/:id',
  requirePermission('master_data.delete'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const product = await MasterProduct.findById(id);
      if (!product) {
        const error: AppError = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }

      // Soft delete
      product.isActive = false;
      await product.save();

      logger.info(`Master product deactivated: ${product.name} by ${(req as AuthRequest).user.email}`);

      res.json({
        success: true,
        message: 'Product deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


